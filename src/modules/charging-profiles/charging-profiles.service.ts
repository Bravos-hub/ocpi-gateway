import { Injectable } from '@nestjs/common'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

@Injectable()
export class ChargingProfilesService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  async getActiveProfile(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    sessionId: string
    duration?: string
    responseUrl?: string
    partnerId?: string
  }) {
    return this.backend.get(`/internal/ocpi/charging-profiles/${args.sessionId}`, {
      version: args.version,
      role: args.role,
      duration: args.duration,
      responseUrl: args.responseUrl,
      partnerId: args.partnerId || null,
    })
  }

  async setChargingProfile(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    sessionId: string
    request: Record<string, unknown>
    correlationId: string
    partnerId?: string
  }) {
    const duplicated = await this.idempotency.isDuplicate('chargingprofiles.set', [
      args.version,
      args.role,
      args.sessionId,
      args.partnerId,
      JSON.stringify(args.request || {}),
    ])

    if (duplicated) {
      return { result: 'ACCEPTED' }
    }

    return this.backend.put('/internal/ocpi/charging-profiles/set', {
      version: args.version,
      role: args.role,
      sessionId: args.sessionId,
      request: args.request,
      correlationId: args.correlationId,
      partnerId: args.partnerId || null,
      requestedAt: new Date().toISOString(),
    })
  }

  async clearChargingProfile(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    sessionId: string
    responseUrl?: string
    correlationId: string
    partnerId?: string
  }) {
    const duplicated = await this.idempotency.isDuplicate('chargingprofiles.clear', [
      args.version,
      args.role,
      args.sessionId,
      args.partnerId,
      args.responseUrl,
    ])

    if (duplicated) {
      return { result: 'ACCEPTED' }
    }

    return this.backend.post('/internal/ocpi/charging-profiles/clear', {
      version: args.version,
      role: args.role,
      sessionId: args.sessionId,
      responseUrl: args.responseUrl || null,
      correlationId: args.correlationId,
      partnerId: args.partnerId || null,
      requestedAt: new Date().toISOString(),
    })
  }

  async receiveAsyncResult(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    sessionId: string
    requestId: string
    result: Record<string, unknown>
    partnerId?: string
  }) {
    const duplicated = await this.idempotency.isDuplicate('chargingprofiles.result', [
      args.version,
      args.role,
      args.sessionId,
      args.requestId,
      args.partnerId,
      JSON.stringify(args.result || {}),
    ])

    if (duplicated) {
      return { duplicated: true }
    }

    return this.backend.post('/internal/ocpi/charging-profiles/results', {
      version: args.version,
      role: args.role,
      sessionId: args.sessionId,
      requestId: args.requestId,
      result: args.result,
      partnerId: args.partnerId || null,
      occurredAt: new Date().toISOString(),
    })
  }

  async upsertActiveProfile(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    sessionId: string
    profile: Record<string, unknown>
    partnerId?: string
  }) {
    return this.backend.put('/internal/ocpi/charging-profiles/active', {
      version: args.version,
      role: args.role,
      sessionId: args.sessionId,
      profile: args.profile,
      partnerId: args.partnerId || null,
      updatedAt: new Date().toISOString(),
    })
  }
}
