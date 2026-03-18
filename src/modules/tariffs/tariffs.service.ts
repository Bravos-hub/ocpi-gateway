import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

@Injectable()
export class TariffsService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly config: ConfigService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async getTariffs(version: '2.2.1' | '2.1.1') {
    const response = await this.backend.get<any>('/internal/ocpi/tariffs')
    const items = Array.isArray(response) ? response : response?.data || []
    return items.map((item: any) => this.normalizeTariff(item, version))
  }

  async upsertPartnerTariff(args: {
    version: '2.2.1' | '2.1.1'
    countryCode: string
    partyId: string
    tariffId: string
    data: Record<string, unknown>
  }) {
    const lastUpdated =
      (args.data as { last_updated?: string }).last_updated || new Date().toISOString()

    const duplicated = await this.idempotency.isDuplicate('tariffs.push', [
      args.version,
      args.countryCode,
      args.partyId,
      args.tariffId,
      lastUpdated,
    ])

    if (duplicated) {
      return { duplicated: true }
    }

    return this.backend.post('/internal/ocpi/partner-tariffs', {
      countryCode: args.countryCode,
      partyId: args.partyId,
      tariffId: args.tariffId,
      version: args.version,
      data: args.data,
      lastUpdated,
    })
  }

  async deletePartnerTariff(args: {
    version: '2.2.1' | '2.1.1'
    countryCode: string
    partyId: string
    tariffId: string
  }) {
    return this.backend.post('/internal/ocpi/partner-tariffs/delete', {
      version: args.version,
      countryCode: args.countryCode,
      partyId: args.partyId,
      tariffId: args.tariffId,
      deletedAt: new Date().toISOString(),
    })
  }

  private normalizeTariff(raw: any, version: '2.2.1' | '2.1.1') {
    const partyId = this.config.get<string>('ocpi.partyId') || 'EVZ'
    const countryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    const lastUpdated = raw?.last_updated || new Date().toISOString()

    const tariff: any = {
      country_code: raw?.country_code || countryCode,
      party_id: raw?.party_id || partyId,
      id: raw?.id || raw?.tariff_id || raw?.name || 'default',
      currency: raw?.currency || 'USD',
      type: raw?.type,
      elements: raw?.elements,
      last_updated: lastUpdated,
      ...raw,
    }

    if (!tariff.elements && raw?.price_components) {
      tariff.elements = [{ price_components: raw.price_components }]
    }

    if (version === '2.1.1') {
      delete tariff.country_code
      delete tariff.party_id
    }

    return tariff
  }
}
