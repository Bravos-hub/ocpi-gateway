import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiEventPublisherService } from '../ocpi/core/ocpi-event-publisher.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

type BackendStation = {
  id: string
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  updatedAt?: string
  chargePoints?: BackendChargePoint[]
  site?: { city?: string }
}

type BackendChargePoint = {
  id: string
  ocppId?: string
  status?: string
  updatedAt?: string
}

type OcpiLocation = Record<string, unknown>

@Injectable()
export class LocationsService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly config: ConfigService,
    private readonly events: OcpiEventPublisherService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async getLocations(): Promise<OcpiLocation[]> {
    const stations = await this.backend.get<BackendStation[]>('/internal/ocpi/locations')
    return stations.map((station) => this.toOcpiLocation(station, '2.2.1'))
  }

  async getLocation(id: string): Promise<OcpiLocation | null> {
    const station = await this.backend.get<BackendStation | null>(`/internal/ocpi/locations/${id}`)
    if (!station) return null
    return this.toOcpiLocation(station, '2.2.1')
  }

  async getLocationsForVersion(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    partnerId?: string
    requestId?: string
    correlationId?: string
  }): Promise<OcpiLocation[]> {
    const stations = await this.backend.get<BackendStation[]>('/internal/ocpi/locations')
    const data = stations.map((station) => this.toOcpiLocation(station, args.version))
    const occurredAt = new Date().toISOString()

    void this.events.publishLocationEvent({
      eventType: 'ocpi.location.export.list',
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

  async getLocationForVersion(
    args: {
      id: string
      version: '2.2.1' | '2.1.1'
      role: string
      partnerId?: string
      requestId?: string
      correlationId?: string
    }
  ): Promise<OcpiLocation | null> {
    const { id, version } = args
    const station = await this.backend.get<BackendStation | null>(`/internal/ocpi/locations/${id}`)
    const data = station ? this.toOcpiLocation(station, version) : null
    const occurredAt = new Date().toISOString()

    void this.events.publishLocationEvent({
      eventType: 'ocpi.location.export.detail',
      role: args.role,
      direction: 'OUTBOUND',
      partnerId: args.partnerId,
      correlationId: args.correlationId,
      requestId: args.requestId,
      occurredAt,
      payload: {
        version: args.version,
        locationId: id,
        found: !!data,
      },
      key: args.requestId || id,
    })

    return data
  }

  async upsertPartnerLocation(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    countryCode: string
    partyId: string
    locationId: string
    evseUid?: string
    connectorId?: string
    data: Record<string, unknown>
    isPatch: boolean
    partnerId?: string
    requestId?: string
    correlationId?: string
  }) {
    const objectType = args.connectorId
      ? 'CONNECTOR'
      : args.evseUid
      ? 'EVSE'
      : 'LOCATION'

    const lastUpdated =
      (args.data as { last_updated?: string }).last_updated || new Date().toISOString()

    const payload = {
      countryCode: args.countryCode,
      partyId: args.partyId,
      locationId: args.locationId,
      evseUid: args.evseUid,
      connectorId: args.connectorId,
      version: args.version,
      data: args.data,
      lastUpdated,
      objectType,
    }

    const duplicated = await this.idempotency.isDuplicate('locations.push', [
      args.version,
      args.countryCode,
      args.partyId,
      args.locationId,
      args.evseUid,
      args.connectorId,
      lastUpdated,
      objectType,
    ])

    if (duplicated) {
      return { duplicated: true }
    }

    let response: unknown
    if (args.isPatch) {
      response = await this.backend.patch('/internal/ocpi/partner-locations', payload)
    } else {
      response = await this.backend.post('/internal/ocpi/partner-locations', payload)
    }

    void this.events.publishLocationEvent({
      eventType: args.isPatch ? 'ocpi.location.import.patch' : 'ocpi.location.import.upsert',
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
        locationId: args.locationId,
        evseUid: args.evseUid,
        connectorId: args.connectorId,
        objectType,
      },
      key: args.requestId || args.locationId,
    })

    return response
  }

  private toOcpiLocation(station: BackendStation, version: '2.2.1' | '2.1.1'): OcpiLocation {
    const partyId = this.config.get<string>('ocpi.partyId') || 'EVZ'
    const countryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    const timeZone = this.config.get<string>('ocpi.timeZone') || 'UTC'
    const connectorStandard =
      this.config.get<string>('ocpi.defaultConnectorStandard') || 'IEC_62196_T2'
    const connectorFormat =
      this.config.get<string>('ocpi.defaultConnectorFormat') || 'SOCKET'
    const connectorPowerType =
      this.config.get<string>('ocpi.defaultConnectorPowerType') || 'AC_3_PHASE'
    const connectorVoltage = parseInt(
      this.config.get<string>('ocpi.defaultConnectorVoltage') || '400',
      10
    )
    const connectorAmperage = parseInt(
      this.config.get<string>('ocpi.defaultConnectorAmperage') || '32',
      10
    )

    const location: Record<string, unknown> = {
      country_code: countryCode,
      party_id: partyId,
      id: station.id,
      publish: true,
      name: station.name || station.id,
      address: station.address || 'Unknown',
      city: station.site?.city || 'Unknown',
      country: countryCode,
      coordinates: {
        latitude: typeof station.latitude === 'number' ? station.latitude.toFixed(6) : '0.000000',
        longitude: typeof station.longitude === 'number' ? station.longitude.toFixed(6) : '0.000000',
      },
      time_zone: timeZone,
      evses: (station.chargePoints || []).map((cp, index) => ({
        uid: (cp.ocppId || cp.id || `EVSE_${index + 1}`).toString().slice(0, 36),
        evse_id: cp.ocppId || cp.id,
        status: this.mapEvseStatus(cp.status),
        connectors: [
          {
            id: '1',
            standard: connectorStandard,
            format: connectorFormat,
            power_type: connectorPowerType,
            voltage: connectorVoltage,
            amperage: connectorAmperage,
            last_updated: cp.updatedAt || station.updatedAt || new Date().toISOString(),
          },
        ],
        last_updated: cp.updatedAt || station.updatedAt || new Date().toISOString(),
      })),
      last_updated: station.updatedAt || new Date().toISOString(),
    }

    if (version === '2.1.1') {
      delete location.country_code
      delete location.party_id
    }

    return location
  }

  private mapEvseStatus(status?: string) {
    if (!status) return 'UNKNOWN'
    const normalized = status.toUpperCase()
    if (['AVAILABLE', 'ONLINE'].includes(normalized)) return 'AVAILABLE'
    if (['OCCUPIED'].includes(normalized)) return 'OCCUPIED'
    if (['RESERVED'].includes(normalized)) return 'RESERVED'
    if (['CHARGING'].includes(normalized)) return 'CHARGING'
    if (['FAULTED', 'OUTOFORDER', 'OFFLINE', 'MAINTENANCE'].includes(normalized)) {
      return 'OUTOFORDER'
    }
    return 'UNKNOWN'
  }
}
