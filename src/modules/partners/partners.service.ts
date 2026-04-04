import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { CreatePartnerDto } from './dto/create-partner.dto'
import { PartnerObservabilityConsumer } from './partner-observability.consumer'
import { PartnerObservabilityService } from './partner-observability.service'
import { UpdatePartnerDto } from './dto/update-partner.dto'
import { OcpiEvent } from '../../contracts/events'
import { KAFKA_TOPICS } from '../../contracts/kafka-topics'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { KafkaService } from '../../platform/kafka.service'

type PartnerEventMeta = {
  eventType?: string
  direction?: 'INBOUND' | 'OUTBOUND'
  requestId?: string
  correlationId?: string
  role?: string
  payload?: Record<string, unknown>
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name)

  constructor(
    private readonly backend: EvzoneApiService,
    private readonly kafka: KafkaService,
    private readonly observabilityConsumer: PartnerObservabilityConsumer,
    private readonly observability: PartnerObservabilityService
  ) {}

  async create(dto: CreatePartnerDto, meta?: PartnerEventMeta) {
    const response = await this.backend.post('/internal/ocpi/partners', {
      name: dto.name,
      partyId: dto.partyId,
      countryCode: dto.countryCode,
      role: dto.role,
      versionsUrl: dto.versionsUrl || null,
      tokenA: dto.tokenA || null,
      status: 'PENDING',
    })

    await this.publishPartnerEvent(response, {
      eventType: meta?.eventType || 'ocpi.partner.admin.create',
      direction: meta?.direction || 'INBOUND',
      requestId: meta?.requestId,
      correlationId: meta?.correlationId,
      role: meta?.role || dto.role,
      payload: {
        source: 'admin',
        ...this.ensureRecord(meta?.payload),
      },
    })

    return response
  }

  async findAll() {
    return this.backend.get('/internal/ocpi/partners')
  }

  async findOne(id: string) {
    const partner = await this.backend.get(`/internal/ocpi/partners/${id}`)
    if (!partner) throw new NotFoundException('Partner not found')
    return partner
  }

  async update(id: string, dto: UpdatePartnerDto, meta?: PartnerEventMeta) {
    const response = await this.backend.patch(`/internal/ocpi/partners/${id}`, dto)

    await this.publishPartnerEvent(response, {
      eventType: meta?.eventType || 'ocpi.partner.admin.update',
      direction: meta?.direction || 'INBOUND',
      requestId: meta?.requestId,
      correlationId: meta?.correlationId,
      role: meta?.role,
      payload: {
        source: 'admin',
        updatedFields: Object.keys(dto),
        ...this.ensureRecord(meta?.payload),
      },
    })

    return response
  }

  async suspend(id: string, meta?: PartnerEventMeta) {
    const response = await this.backend.patch(`/internal/ocpi/partners/${id}`, {
      status: 'SUSPENDED',
    })

    await this.publishPartnerEvent(response, {
      eventType: meta?.eventType || 'ocpi.partner.admin.suspend',
      direction: meta?.direction || 'INBOUND',
      requestId: meta?.requestId,
      correlationId: meta?.correlationId,
      role: meta?.role,
      payload: {
        source: 'admin',
        status: 'SUSPENDED',
        ...this.ensureRecord(meta?.payload),
      },
    })

    return response
  }

  async findByToken(token: string) {
    if (!token) return null
    const results = await this.backend.get('/internal/ocpi/partners', { token })
    if (Array.isArray(results)) {
      return results[0] || null
    }
    return results || null
  }

  async upsertFromCredentials(args: {
    tokenA?: string | null
    tokenB: string
    tokenC: string
    partyId: string
    countryCode: string
    role: string
    name: string
    versionsUrl: string
    roles?: Record<string, unknown>[] | null
    endpoints?: Record<string, unknown>[] | null
    version?: string
    requestId?: string
    correlationId?: string
  }) {
    const existing = args.tokenA ? await this.findByToken(args.tokenA) : null
    const lastSyncAt = new Date().toISOString()

    if (existing) {
      const response = await this.backend.patch(`/internal/ocpi/partners/${existing.id}`, {
        tokenB: args.tokenB,
        tokenC: args.tokenC,
        partyId: args.partyId,
        countryCode: args.countryCode,
        role: args.role,
        name: args.name,
        versionsUrl: args.versionsUrl,
        roles: args.roles || null,
        endpoints: args.endpoints || null,
        version: args.version || '2.2.1',
        status: 'ACTIVE',
        lastSyncAt,
      })

      await this.publishPartnerEvent(response, {
        eventType: 'ocpi.partner.credentials.update',
        direction: 'INBOUND',
        requestId: args.requestId,
        correlationId: args.correlationId,
        role: args.role,
        payload: {
          source: 'credentials',
          discoveredVersion: args.version || '2.2.1',
          endpointCount: Array.isArray(args.endpoints) ? args.endpoints.length : 0,
          rolesCount: Array.isArray(args.roles) ? args.roles.length : 0,
          lastSyncAt,
        },
      })

      return response
    }

    const response = await this.backend.post('/internal/ocpi/partners', {
      name: args.name,
      partyId: args.partyId,
      countryCode: args.countryCode,
      role: args.role,
      status: 'ACTIVE',
      versionsUrl: args.versionsUrl,
      tokenA: args.tokenA || null,
      tokenB: args.tokenB,
      tokenC: args.tokenC,
      roles: args.roles || null,
      endpoints: args.endpoints || null,
      version: args.version || '2.2.1',
      lastSyncAt,
    })

    await this.publishPartnerEvent(response, {
      eventType: 'ocpi.partner.credentials.create',
      direction: 'INBOUND',
      requestId: args.requestId,
      correlationId: args.correlationId,
      role: args.role,
      payload: {
        source: 'credentials',
        discoveredVersion: args.version || '2.2.1',
        endpointCount: Array.isArray(args.endpoints) ? args.endpoints.length : 0,
        rolesCount: Array.isArray(args.roles) ? args.roles.length : 0,
        lastSyncAt,
      },
    })

    return response
  }

  async getObservabilityOverview(limit?: number) {
    const [partners, summaries] = await Promise.all([
      this.findAll(),
      this.observability.listPartnerObservability(limit),
    ])

    const rows = Array.isArray(partners) ? partners : []
    const partnersById = new Map(
      rows
        .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
        .map((row) => [String(row.id || ''), row])
    )

    return {
      monitoring: this.observabilityConsumer.getStatus(),
      partners: summaries.map((summary) => ({
        partner: partnersById.get(summary.partnerId) || null,
        observability: summary,
      })),
    }
  }

  async getObservability(id: string, limit?: number) {
    const [partner, observability] = await Promise.all([
      this.findOne(id),
      this.observability.getPartnerObservability(id, limit),
    ])

    return {
      monitoring: this.observabilityConsumer.getStatus(),
      partner,
      observability,
    }
  }

  private async publishPartnerEvent(record: unknown, meta: PartnerEventMeta): Promise<void> {
    const partner = this.ensureRecord(record)
    const partnerId = this.extractString(partner.id)
    if (!partnerId) return

    const event: OcpiEvent = {
      eventId: randomUUID(),
      eventType: meta.eventType || 'ocpi.partner.update',
      source: 'ocpi-gateway',
      occurredAt: new Date().toISOString(),
      ...(meta.correlationId ? { correlationId: meta.correlationId } : {}),
      partnerId,
      ...(this.extractString(partner.partyId) ? { partyId: this.extractString(partner.partyId) } : {}),
      ...(this.extractString(partner.countryCode)
        ? { countryCode: this.extractString(partner.countryCode) }
        : {}),
      ...(this.resolveRole(meta.role, partner) ? { role: this.resolveRole(meta.role, partner) } : {}),
      module: 'partners',
      direction: meta.direction || 'INBOUND',
      payload: {
        ...(meta.requestId ? { requestId: meta.requestId } : {}),
        ...(this.extractString(partner.name) ? { name: this.extractString(partner.name) } : {}),
        ...(this.extractString(partner.status)
          ? { status: this.extractString(partner.status) }
          : {}),
        ...(this.extractString(partner.version)
          ? { version: this.extractString(partner.version) }
          : {}),
        ...(this.extractString(partner.versionsUrl)
          ? { versionsUrl: this.extractString(partner.versionsUrl) }
          : {}),
        ...this.ensureRecord(meta.payload),
      },
    }

    try {
      await this.kafka.publish(
        KAFKA_TOPICS.ocpiPartnerEvents,
        JSON.stringify(event),
        meta.requestId || partnerId
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`OCPI partner event publish failed: ${message}`)
    }
  }

  private resolveRole(fallback: string | undefined, record: Record<string, unknown>): string | undefined {
    const value = fallback || this.extractString(record.role)
    return value ? value.toLowerCase() : undefined
  }

  private ensureRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
    return {}
  }

  private extractString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}
