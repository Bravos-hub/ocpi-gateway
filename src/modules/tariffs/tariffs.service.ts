import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiEventPublisherService } from '../ocpi/core/ocpi-event-publisher.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

@Injectable()
export class TariffsService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly config: ConfigService,
    private readonly events: OcpiEventPublisherService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async getTariffs(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const items = await this.fetchTariffs()
    const data = items.map((item: any) => this.normalizeTariff(item, args.version))
    const occurredAt = new Date().toISOString()

    void this.events.publishTariffEvent({
      eventType: 'ocpi.tariff.export.list',
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

  async getTariff(args: {
    version: '2.2.1' | '2.1.1'
    tariffId: string
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const items = await this.fetchTariffs()
    const data =
      items
        .map((item: any) => this.normalizeTariff(item, args.version))
        .find((tariff: unknown) => (tariff as { id?: string }).id === args.tariffId) || null
    const occurredAt = new Date().toISOString()

    void this.events.publishTariffEvent({
      eventType: 'ocpi.tariff.export.detail',
      role: args.role,
      direction: 'OUTBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      occurredAt,
      payload: {
        version: args.version,
        tariffId: args.tariffId,
        found: !!data,
      },
      key: args.requestId || args.tariffId,
    })

    return data
  }

  async upsertPartnerTariff(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
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

    const response = await this.backend.post('/internal/ocpi/partner-tariffs', {
      countryCode: args.countryCode,
      partyId: args.partyId,
      tariffId: args.tariffId,
      version: args.version,
      data: args.data,
      lastUpdated,
    })

    void this.events.publishTariffEvent({
      eventType: 'ocpi.tariff.import.upsert',
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
        tariffId: args.tariffId,
        currency: this.extractString(args.data, 'currency'),
      },
      key: args.requestId || args.tariffId,
    })

    return response
  }

  async deletePartnerTariff(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
    countryCode: string
    partyId: string
    tariffId: string
  }) {
    const deletedAt = new Date().toISOString()
    const response = await this.backend.post('/internal/ocpi/partner-tariffs/delete', {
      version: args.version,
      countryCode: args.countryCode,
      partyId: args.partyId,
      tariffId: args.tariffId,
      deletedAt,
    })

    void this.events.publishTariffEvent({
      eventType: 'ocpi.tariff.import.delete',
      role: args.role,
      direction: 'INBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      countryCode: args.countryCode,
      partyId: args.partyId,
      occurredAt: deletedAt,
      payload: {
        version: args.version,
        tariffId: args.tariffId,
      },
      key: args.requestId || args.tariffId,
    })

    return response
  }

  private async fetchTariffs() {
    const response = await this.backend.get<any>('/internal/ocpi/tariffs')
    return Array.isArray(response) ? response : response?.data || []
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

  private extractString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key]
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
  }
}
