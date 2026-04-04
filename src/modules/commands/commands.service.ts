import { Injectable } from '@nestjs/common'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { OcpiEventPublisherService } from '../ocpi/core/ocpi-event-publisher.service'
import { OcpiIdempotencyService } from '../ocpi/core/ocpi-idempotency.service'

const COMMAND_TYPES = new Set([
  'CANCEL_RESERVATION',
  'RESERVE_NOW',
  'START_SESSION',
  'STOP_SESSION',
  'UNLOCK_CONNECTOR',
])

@Injectable()
export class CommandsService {
  constructor(
    private readonly backend: EvzoneApiService,
    private readonly events: OcpiEventPublisherService,
    private readonly idempotency: OcpiIdempotencyService
  ) {}

  isSupportedCommand(command: string): boolean {
    return COMMAND_TYPES.has(command.toUpperCase())
  }

  async submitCommand(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    command: string
    request: Record<string, unknown>
    requestId: string
    correlationId: string
    partnerId?: string
  }) {
    const command = args.command.toUpperCase()
    const duplicated = await this.idempotency.isDuplicate('commands.request', [
      args.version,
      args.role,
      command,
      args.requestId,
      args.partnerId,
      (args.request as { response_url?: string }).response_url,
    ])

    if (duplicated) {
      return { result: 'ACCEPTED' }
    }

    const requestedAt = new Date().toISOString()
    const response = await this.backend.post<any>('/internal/ocpi/commands/requests', {
      version: args.version,
      role: args.role,
      command,
      request: args.request,
      requestId: args.requestId,
      correlationId: args.correlationId,
      partnerId: args.partnerId || null,
      requestedAt,
    })

    void this.events.publishCommandRequest({
      requestId: args.requestId,
      partnerId: args.partnerId,
      command,
      responseUrl: (args.request as { response_url?: string; responseUrl?: string }).response_url ||
        (args.request as { response_url?: string; responseUrl?: string }).responseUrl ||
        null,
      payload: args.request,
      requestedAt,
    })

    if (response && typeof response === 'object' && 'result' in response) {
      return response
    }

    return { result: 'ACCEPTED' }
  }

  async receiveCommandResult(args: {
    version: '2.2.1' | '2.1.1'
    role: string
    command: string
    requestId: string
    result: Record<string, unknown>
    correlationId: string
    partnerId?: string
  }) {
    const command = args.command.toUpperCase()
    const duplicated = await this.idempotency.isDuplicate('commands.result', [
      args.version,
      args.role,
      command,
      args.requestId,
      args.partnerId,
      JSON.stringify(args.result || {}),
    ])

    if (duplicated) {
      return { duplicated: true }
    }

    const occurredAt = new Date().toISOString()
    const response = await this.backend.post('/internal/ocpi/commands/results', {
      version: args.version,
      role: args.role,
      command,
      requestId: args.requestId,
      result: args.result,
      correlationId: args.correlationId,
      partnerId: args.partnerId || null,
      occurredAt,
    })

    void this.events.publishCommandResult({
      requestId: args.requestId,
      partnerId: args.partnerId,
      command,
      result: this.resolveResultStatus(args.result),
      occurredAt,
      payload: args.result,
    })

    return response
  }

  private resolveResultStatus(result: Record<string, unknown>): string {
    const value = result.result
    if (typeof value !== 'string') return 'UNKNOWN'
    const normalized = value.trim().toUpperCase()
    return normalized || 'UNKNOWN'
  }
}
