import { Injectable } from '@nestjs/common'
import { EvzoneApiService } from '../../platform/evzone-api.service'
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

    const response = await this.backend.post<any>('/internal/ocpi/commands/requests', {
      version: args.version,
      role: args.role,
      command,
      request: args.request,
      requestId: args.requestId,
      correlationId: args.correlationId,
      partnerId: args.partnerId || null,
      requestedAt: new Date().toISOString(),
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

    return this.backend.post('/internal/ocpi/commands/results', {
      version: args.version,
      role: args.role,
      command,
      requestId: args.requestId,
      result: args.result,
      correlationId: args.correlationId,
      partnerId: args.partnerId || null,
      occurredAt: new Date().toISOString(),
    })
  }
}
