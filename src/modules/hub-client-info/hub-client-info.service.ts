import { Injectable } from '@nestjs/common'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

@Injectable()
export class HubClientInfoService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async listClientInfo(args: { version: '2.2.1' | '2.1.1'; role: string }) {
    const response = await this.backend.get<any>('/internal/ocpi/hub-client-info', {
      version: args.version,
      role: args.role,
    })
    return Array.isArray(response) ? response : response?.data || []
  }

  async getClientInfo(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    countryCode: string
    partyId: string
  }) {
    return this.backend.get<any>('/internal/ocpi/hub-client-info/object', {
      version: args.version,
      role: args.role,
      countryCode: args.countryCode,
      partyId: args.partyId,
    })
  }

  async upsertClientInfo(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    countryCode: string
    partyId: string
    data: Record<string, unknown>
  }) {
    const lastUpdated =
      (args.data as { last_updated?: string }).last_updated || new Date().toISOString()

    const duplicated = await this.idempotency.isDuplicate('hubclientinfo.push', [
      args.version,
      args.role,
      args.countryCode,
      args.partyId,
      lastUpdated,
    ])

    if (duplicated) {
      return { duplicated: true }
    }

    return this.backend.put('/internal/ocpi/hub-client-info', {
      version: args.version,
      role: args.role,
      countryCode: args.countryCode,
      partyId: args.partyId,
      data: args.data,
      lastUpdated,
    })
  }
}
