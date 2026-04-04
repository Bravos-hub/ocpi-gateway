import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiEventPublisherService } from '../ocpi/core/ocpi-event-publisher.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

type BackendToken = {
  countryCode?: string
  partyId?: string
  tokenUid?: string
  tokenType?: string
  data?: Record<string, unknown>
  lastUpdated?: string
}

@Injectable()
export class TokensService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly config: ConfigService,
    private readonly events: OcpiEventPublisherService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async getTokens(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const response = await this.backend.get<any>('/internal/ocpi/tokens')
    const items = Array.isArray(response) ? response : response?.data || []
    const data = items.map((item: BackendToken) => this.normalizeToken(item, args.version))
    const occurredAt = new Date().toISOString()

    void this.events.publishTokenEvent({
      eventType: 'ocpi.token.export.list',
      role: args.role,
      direction: 'OUTBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      occurredAt,
      payload: {
        version: args.version,
        count: data.length,
      },
      key: args.requestId,
    })

    return data
  }

  async getPartnerToken(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    countryCode: string
    partyId: string
    tokenUid: string
    tokenType: string
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const response = await this.backend.get<any>('/internal/ocpi/partner-tokens', {
      countryCode: args.countryCode,
      partyId: args.partyId,
      tokenUid: args.tokenUid,
      tokenType: args.tokenType,
      version: args.version,
    })
    const data = Array.isArray(response) ? response[0] || null : response || null
    const occurredAt = new Date().toISOString()

    void this.events.publishTokenEvent({
      eventType: 'ocpi.token.export.detail',
      role: args.role,
      direction: 'OUTBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      countryCode: args.countryCode,
      partyId: args.partyId,
      occurredAt,
      payload: {
        version: args.version,
        tokenUid: args.tokenUid,
        tokenType: args.tokenType,
        found: !!data?.data,
      },
      key: args.requestId || args.tokenUid,
    })

    return data
  }

  async upsertPartnerToken(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    countryCode: string
    partyId: string
    tokenUid: string
    tokenType: string
    data: Record<string, unknown>
    isPatch?: boolean
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const lastUpdated =
      (args.data as { last_updated?: string }).last_updated || new Date().toISOString()

    const duplicated = await this.idempotency.isDuplicate('tokens.push', [
      args.version,
      args.countryCode,
      args.partyId,
      args.tokenUid,
      args.tokenType,
      lastUpdated,
    ])

    if (duplicated) {
      return { duplicated: true }
    }

    const response = await this.backend.post('/internal/ocpi/partner-tokens', {
      countryCode: args.countryCode,
      partyId: args.partyId,
      tokenUid: args.tokenUid,
      tokenType: args.tokenType,
      version: args.version,
      data: args.data,
      lastUpdated,
    })

    void this.events.publishTokenEvent({
      eventType: 'ocpi.token.import.upsert',
      role: args.role,
      direction: 'INBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      countryCode: args.countryCode,
      partyId: args.partyId,
      occurredAt: lastUpdated,
      payload: {
        version: args.version,
        tokenUid: args.tokenUid,
        tokenType: args.tokenType,
        operation: args.isPatch ? 'PATCH' : 'PUT',
      },
      key: args.requestId || args.tokenUid,
    })

    return response
  }

  async authorizeToken(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    tokenUid: string
    tokenType: string
    location?: Record<string, unknown>
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const countryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    const partyId = this.config.get<string>('ocpi.partyId') || 'EVZ'
    const occurredAt = new Date().toISOString()

    const result = await this.backend.post('/internal/ocpi/tokens/authorize', {
      tokenUid: args.tokenUid,
      tokenType: args.tokenType,
      countryCode,
      partyId,
      location: args.location,
    })

    void this.events.publishTokenEvent({
      eventType: 'ocpi.token.authorize.result',
      role: args.role,
      direction: 'INBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      countryCode,
      partyId,
      occurredAt,
      payload: {
        version: args.version,
        tokenUid: args.tokenUid,
        tokenType: args.tokenType,
        found: !!result,
        allowed: this.extractAllowed(result),
        hasLocation: !!args.location,
      },
      key: args.requestId || args.tokenUid,
    })

    return result
  }

  private normalizeToken(raw: BackendToken, version: '2.2.1' | '2.1.1') {
    const partyId = this.config.get<string>('ocpi.partyId') || 'EVZ'
    const countryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    const data = raw.data || (raw as Record<string, unknown>)

    const token: any = {
      country_code: (data as any).country_code || raw.countryCode || countryCode,
      party_id: (data as any).party_id || raw.partyId || partyId,
      uid: (data as any).uid || raw.tokenUid,
      type: (data as any).type || raw.tokenType || 'RFID',
      ...data,
    }

    if (version === '2.1.1') {
      delete token.country_code
      delete token.party_id
    }

    return token
  }

  private extractAllowed(result: unknown): string | undefined {
    if (!result || typeof result !== 'object') return undefined
    const value = (result as Record<string, unknown>).allowed
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
  }
}
