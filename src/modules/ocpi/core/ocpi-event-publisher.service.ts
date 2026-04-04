import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  OcpiCommandEvent,
  OcpiCommandRequest,
  OcpiEvent,
} from '../../../contracts/events'
import { KAFKA_TOPICS } from '../../../contracts/kafka-topics'
import { KafkaService } from '../../../platform/kafka.service'

type PublishModuleEventArgs = {
  topic: string
  module: string
  eventType: string
  role: string
  direction: 'INBOUND' | 'OUTBOUND'
  occurredAt: string
  partnerId?: string
  correlationId?: string
  requestId?: string
  countryCode?: string
  partyId?: string
  payload?: Record<string, unknown>
  key?: string
}

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

  async publishSessionEvent(
    args: Omit<PublishModuleEventArgs, 'topic' | 'module'>
  ): Promise<void> {
    await this.publishModuleEvent({
      ...args,
      topic: KAFKA_TOPICS.ocpiSessionEvents,
      module: 'sessions',
    })
  }

  async publishCdrEvent(
    args: Omit<PublishModuleEventArgs, 'topic' | 'module'>
  ): Promise<void> {
    await this.publishModuleEvent({
      ...args,
      topic: KAFKA_TOPICS.ocpiCdrEvents,
      module: 'cdrs',
    })
  }

  async publishTariffEvent(
    args: Omit<PublishModuleEventArgs, 'topic' | 'module'>
  ): Promise<void> {
    await this.publishModuleEvent({
      ...args,
      topic: KAFKA_TOPICS.ocpiTariffEvents,
      module: 'tariffs',
    })
  }

  async publishLocationEvent(
    args: Omit<PublishModuleEventArgs, 'topic' | 'module'>
  ): Promise<void> {
    await this.publishModuleEvent({
      ...args,
      topic: KAFKA_TOPICS.ocpiLocationEvents,
      module: 'locations',
    })
  }

  async publishTokenEvent(
    args: Omit<PublishModuleEventArgs, 'topic' | 'module'>
  ): Promise<void> {
    await this.publishModuleEvent({
      ...args,
      topic: KAFKA_TOPICS.ocpiTokenEvents,
      module: 'tokens',
    })
  }

  async publishCredentialEvent(
    args: Omit<PublishModuleEventArgs, 'topic' | 'module'>
  ): Promise<void> {
    await this.publishModuleEvent({
      ...args,
      topic: KAFKA_TOPICS.ocpiCredentialEvents,
      module: 'credentials',
    })
  }

  private async publishModuleEvent(args: PublishModuleEventArgs): Promise<void> {
    const event: OcpiEvent = {
      eventId: randomUUID(),
      eventType: args.eventType,
      source: 'ocpi-gateway',
      occurredAt: args.occurredAt,
      ...(args.correlationId ? { correlationId: args.correlationId } : {}),
      ...(args.partnerId ? { partnerId: args.partnerId } : {}),
      ...(args.countryCode ? { countryCode: args.countryCode } : {}),
      ...(args.partyId ? { partyId: args.partyId } : {}),
      role: args.role,
      module: args.module,
      direction: args.direction,
      payload: {
        ...(args.requestId ? { requestId: args.requestId } : {}),
        ...(args.payload || {}),
      },
    }

    await this.publishJson(args.topic, event, args.key)
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
