import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

@Injectable()
export class CdrsService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly config: ConfigService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async createCdr(args: {
    version: '2.2.1' | '2.1.1'
    data: Record<string, unknown>
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

    return this.backend.post('/internal/ocpi/cdrs', {
      countryCode,
      partyId,
      cdrId,
      version: args.version,
      data: args.data,
      lastUpdated,
    })
  }

  async listCdrs() {
    const response = await this.backend.get<any>('/internal/ocpi/cdrs')
    return Array.isArray(response) ? response : response?.data || []
  }

  async getCdr(id: string) {
    const response = await this.backend.get<any>(`/internal/ocpi/cdrs/${id}`)
    if (!response) return null
    return Array.isArray(response) ? response[0] || null : response
  }
}
