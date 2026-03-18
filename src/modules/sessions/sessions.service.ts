import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

type BackendSession = {
  id: string
  stationId?: string
  ocppId?: string
  connectorId?: number
  startTime?: string
  endTime?: string
  totalEnergy?: number
  status?: string
  updatedAt?: string
  idTag?: string | null
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly config: ConfigService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async getSessions(version: '2.2.1' | '2.1.1') {
    const sessions = await this.backend.get<BackendSession[]>('/internal/ocpi/sessions')
    return sessions.map((session) => this.toOcpiSession(session, version))
  }

  async getSession(id: string, version: '2.2.1' | '2.1.1') {
    const session = await this.backend.get<BackendSession | null>(`/internal/ocpi/sessions/${id}`)
    if (!session) return null
    return this.toOcpiSession(session, version)
  }

  async upsertPartnerSession(args: {
    version: '2.2.1' | '2.1.1'
    countryCode: string
    partyId: string
    sessionId: string
    data: Record<string, unknown>
  }) {
    const lastUpdated =
      (args.data as { last_updated?: string }).last_updated || new Date().toISOString()

    const duplicated = await this.idempotency.isDuplicate('sessions.push', [
      args.version,
      args.countryCode,
      args.partyId,
      args.sessionId,
      lastUpdated,
    ])

    if (duplicated) {
      return { duplicated: true }
    }

    return this.backend.post('/internal/ocpi/partner-sessions', {
      countryCode: args.countryCode,
      partyId: args.partyId,
      sessionId: args.sessionId,
      version: args.version,
      data: args.data,
      lastUpdated,
    })
  }

  async setChargingPreferences(args: {
    version: '2.2.1' | '2.1.1'
    sessionId: string
    data: Record<string, unknown>
  }) {
    return this.backend.put(`/internal/ocpi/sessions/${args.sessionId}/charging-preferences`, {
      version: args.version,
      data: args.data,
      updatedAt: new Date().toISOString(),
    })
  }

  private toOcpiSession(session: BackendSession, version: '2.2.1' | '2.1.1') {
    const partyId = this.config.get<string>('ocpi.partyId') || 'EVZ'
    const countryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    const issuer = this.config.get<string>('ocpi.businessName') || 'EVzone'

    const status = this.mapSessionStatus(session.status)
    const lastUpdated =
      session.updatedAt || session.endTime || session.startTime || new Date().toISOString()

    const ocpiSession: any = {
      country_code: countryCode,
      party_id: partyId,
      id: session.id,
      status,
      start_date_time: session.startTime || new Date().toISOString(),
      end_date_time: session.endTime || null,
      kwh: session.totalEnergy ? session.totalEnergy / 1000 : 0,
      location_id: session.stationId || 'UNKNOWN',
      evse_uid: session.ocppId || session.stationId || 'EVSE',
      connector_id: session.connectorId !== undefined ? String(session.connectorId) : '1',
      auth_method: session.idTag ? 'AUTH_REQUEST' : 'WHITELIST',
      cdr_token: session.idTag
        ? {
            uid: session.idTag,
            type: 'RFID',
            contract_id: session.idTag,
            issuer,
            valid: true,
            whitelist: 'ALLOWED',
            last_updated: lastUpdated,
            country_code: countryCode,
            party_id: partyId,
          }
        : undefined,
      last_updated: lastUpdated,
    }

    if (version === '2.1.1') {
      delete ocpiSession.country_code
      delete ocpiSession.party_id
      if (ocpiSession.cdr_token) {
        delete ocpiSession.cdr_token.country_code
        delete ocpiSession.cdr_token.party_id
      }
    }

    return ocpiSession
  }

  private mapSessionStatus(status?: string) {
    if (!status) return 'PENDING'
    const normalized = status.toUpperCase()
    if (normalized === 'ACTIVE') return 'ACTIVE'
    if (['COMPLETED', 'STOPPED'].includes(normalized)) return 'COMPLETED'
    return 'INVALID'
  }
}
