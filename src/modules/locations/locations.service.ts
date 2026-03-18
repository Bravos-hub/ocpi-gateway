import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
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

  async getLocationsForVersion(version: '2.2.1' | '2.1.1'): Promise<OcpiLocation[]> {
    const stations = await this.backend.get<BackendStation[]>('/internal/ocpi/locations')
    return stations.map((station) => this.toOcpiLocation(station, version))
  }

  async getLocationForVersion(
    id: string,
    version: '2.2.1' | '2.1.1'
  ): Promise<OcpiLocation | null> {
    const station = await this.backend.get<BackendStation | null>(`/internal/ocpi/locations/${id}`)
    if (!station) return null
    return this.toOcpiLocation(station, version)
  }

  async upsertPartnerLocation(args: {
    version: '2.2.1' | '2.1.1'
    countryCode: string
    partyId: string
    locationId: string
    evseUid?: string
    connectorId?: string
    data: Record<string, unknown>
    isPatch: boolean
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

    if (args.isPatch) {
      return this.backend.patch('/internal/ocpi/partner-locations', payload)
    }
    return this.backend.post('/internal/ocpi/partner-locations', payload)
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
