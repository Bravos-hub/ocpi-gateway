import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiEventPublisherService } from '../ocpi/core/ocpi-event-publisher.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

@Injectable()
export class CdrsService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly config: ConfigService,
    private readonly events: OcpiEventPublisherService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async createCdr(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    data: Record<string, unknown>
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const countryCode =
      (args.data as { country_code?: string }).country_code ||
      this.config.get<string>('ocpi.countryCode') ||
      'US'
    const partyId =
      (args.data as { party_id?: string }).party_id ||
      this.config.get<string>('ocpi.partyId') ||
      'EVZ'
    const cdrId =
      (args.data as { id?: string }).id ||
      (args.data as { cdr_id?: string }).cdr_id ||
      ''
    const lastUpdated =
      (args.data as { last_updated?: string }).last_updated || new Date().toISOString()

    const duplicated = await this.idempotency.isDuplicate('cdrs.push', [
      args.version,
      countryCode,
      partyId,
      cdrId,
      lastUpdated,
    ])

    if (duplicated) {
      return { duplicated: true, cdrId }
    }

    const response = await this.backend.post('/internal/ocpi/cdrs', {
      countryCode,
      partyId,
      cdrId,
      version: args.version,
      data: args.data,
      lastUpdated,
    })

    void this.events.publishCdrEvent({
      eventType: 'ocpi.cdr.import.create',
      role: args.role,
      direction: 'INBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      countryCode,
      partyId,
      occurredAt: lastUpdated,
      payload: {
        version: args.version,
        cdrId,
        sessionId: this.extractString(args.data, 'session_id'),
      },
      key: args.requestId || cdrId,
    })

    return response
  }

  async listCdrs(args: {
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const response = await this.backend.get<any>('/internal/ocpi/cdrs')
    const data = Array.isArray(response) ? response : response?.data || []
    const occurredAt = new Date().toISOString()

    void this.events.publishCdrEvent({
      eventType: 'ocpi.cdr.export.list',
      role: args.role,
      direction: 'OUTBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      occurredAt,
      payload: {
        count: data.length,
      },
      key: args.requestId,
    })

    return data
  }

  async getCdr(args: {
    id: string
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const { id } = args
    const response = await this.backend.get<any>(`/internal/ocpi/cdrs/${id}`)
    const data = !response ? null : Array.isArray(response) ? response[0] || null : response
    const occurredAt = new Date().toISOString()

    void this.events.publishCdrEvent({
      eventType: 'ocpi.cdr.export.detail',
      role: args.role,
      direction: 'OUTBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      occurredAt,
      payload: {
        cdrId: id,
        sessionId: this.extractString(data, 'session_id'),
        found: !!data,
      },
      key: args.requestId || id,
    })

    return data
  }

  private extractString(
    record: Record<string, unknown> | null | undefined,
    key: string
  ): string | undefined {
    const value = record?.[key]
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
  }
}
