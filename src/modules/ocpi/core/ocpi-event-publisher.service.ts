import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  OcpiCommandEvent,
  OcpiCommandRequest,
  OcpiEvent,
} from '../../../contracts/events'
import { KAFKA_TOPICS } from '../../../contracts/kafka-topics'
import { KafkaService } from '../../../platform/kafka.service'

@Injectable()
export class OcpiEventPublisherService {
  private readonly logger = new Logger(OcpiEventPublisherService.name)

  constructor(private readonly kafka: KafkaService) {}

  async publishCommandRequest(args: {
    requestId: string
    partnerId?: string
    command: string
    responseUrl?: string | null
    payload: Record<string, unknown>
    requestedAt: string
  }): Promise<void> {
    const event: OcpiCommandRequest = {
      requestId: args.requestId,
      ...(args.partnerId ? { partnerId: args.partnerId } : {}),
      command: args.command,
      ...(args.responseUrl ? { responseUrl: args.responseUrl } : {}),
      payload: args.payload,
      requestedAt: args.requestedAt,
    }

    await this.publishJson(
      KAFKA_TOPICS.ocpiCommandRequests,
      event,
      args.requestId
    )
  }

  async publishCommandResult(args: {
    requestId: string
    partnerId?: string
    command: string
    result: string
    occurredAt: string
    payload?: Record<string, unknown>
  }): Promise<void> {
    const event: OcpiCommandEvent = {
      requestId: args.requestId,
      ...(args.partnerId ? { partnerId: args.partnerId } : {}),
      command: args.command,
      result: args.result,
      occurredAt: args.occurredAt,
      ...(args.payload ? { payload: args.payload } : {}),
    }

    await this.publishJson(KAFKA_TOPICS.ocpiCommandEvents, event, args.requestId)
  }

  async publishChargingProfileEvent(args: {
    eventType: string
    correlationId?: string
    partnerId?: string
    role: string
    sessionId: string
    requestId?: string
    payload?: Record<string, unknown>
    occurredAt: string
  }): Promise<void> {
    const event: OcpiEvent = {
      eventId: randomUUID(),
      eventType: args.eventType,
      source: 'ocpi-gateway',
      occurredAt: args.occurredAt,
      ...(args.correlationId ? { correlationId: args.correlationId } : {}),
      ...(args.partnerId ? { partnerId: args.partnerId } : {}),
      role: args.role,
      module: 'chargingprofiles',
      direction: 'INBOUND',
      payload: {
        sessionId: args.sessionId,
        ...(args.requestId ? { requestId: args.requestId } : {}),
        ...(args.payload || {}),
      },
    }

    await this.publishJson(
      KAFKA_TOPICS.ocpiChargingProfileEvents,
      event,
      args.requestId || args.sessionId
    )
  }

  private async publishJson(
    topic: string,
    payload: Record<string, unknown>,
    key?: string
  ): Promise<void> {
    try {
      await this.kafka.publish(topic, JSON.stringify(payload), key)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`OCPI event publish failed for topic=${topic}: ${message}`)
    }
  }
}
