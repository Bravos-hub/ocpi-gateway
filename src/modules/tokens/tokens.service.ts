import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
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
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async getTokens(version: '2.2.1' | '2.1.1') {
    const response = await this.backend.get<any>('/internal/ocpi/tokens')
    const items = Array.isArray(response) ? response : response?.data || []
    return items.map((item: BackendToken) => this.normalizeToken(item, version))
  }

  async getPartnerToken(args: {
    version: '2.2.1' | '2.1.1'
    countryCode: string
    partyId: string
    tokenUid: string
    tokenType: string
  }) {
    const response = await this.backend.get<any>('/internal/ocpi/partner-tokens', {
      countryCode: args.countryCode,
      partyId: args.partyId,
      tokenUid: args.tokenUid,
      tokenType: args.tokenType,
      version: args.version,
    })
    if (Array.isArray(response)) {
      return response[0] || null
    }
    return response || null
  }

  async upsertPartnerToken(args: {
    version: '2.2.1' | '2.1.1'
    countryCode: string
    partyId: string
    tokenUid: string
    tokenType: string
    data: Record<string, unknown>
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

    return this.backend.post('/internal/ocpi/partner-tokens', {
      countryCode: args.countryCode,
      partyId: args.partyId,
      tokenUid: args.tokenUid,
      tokenType: args.tokenType,
      version: args.version,
      data: args.data,
      lastUpdated,
    })
  }

  async authorizeToken(args: {
    tokenUid: string
    tokenType: string
    location?: Record<string, unknown>
  }) {
    const countryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    const partyId = this.config.get<string>('ocpi.partyId') || 'EVZ'

    return this.backend.post('/internal/ocpi/tokens/authorize', {
      tokenUid: args.tokenUid,
      tokenType: args.tokenType,
      countryCode,
      partyId,
      location: args.location,
    })
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
}
