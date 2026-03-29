import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OcpiCommandEvent, OcpiCommandRequest, OcpiEvent } from '../../contracts/events'
import { KAFKA_TOPICS } from '../../contracts/kafka-topics'
import { RedisService } from '../../platform/redis.service'

type CounterMetric =
  | 'commandRequests'
  | 'commandResults'
  | 'commandAccepted'
  | 'commandRejected'
  | 'commandFailed'
  | 'commandTimeout'
  | 'chargingProfileEvents'
  | 'sessionEvents'
  | 'cdrEvents'
  | 'tariffEvents'
  | 'locationEvents'
  | 'tokenEvents'
  | 'credentialEvents'
  | 'partnerEvents'

type PartnerObservabilitySummary = {
  partnerId: string
  lastActivityAt: string | null
  lastCommandRequestAt: string | null
  lastCommandResultAt: string | null
  lastChargingProfileEventAt: string | null
  lastSessionEventAt: string | null
  lastCdrEventAt: string | null
  lastTariffEventAt: string | null
  lastLocationEventAt: string | null
  lastTokenEventAt: string | null
  lastCredentialEventAt: string | null
  lastPartnerEventAt: string | null
  latestCommand: string | null
  latestCommandResult: string | null
  latestChargingProfileEventType: string | null
  latestSessionEventType: string | null
  latestCdrEventType: string | null
  latestTariffEventType: string | null
  latestLocationEventType: string | null
  latestTokenEventType: string | null
  latestCredentialEventType: string | null
  latestPartnerEventType: string | null
  counts: {
    commandRequests: number
    commandResults: number
    commandAccepted: number
    commandRejected: number
    commandFailed: number
    commandTimeout: number
    chargingProfileEvents: number
    sessionEvents: number
    cdrEvents: number
    tariffEvents: number
    locationEvents: number
    tokenEvents: number
    credentialEvents: number
    partnerEvents: number
  }
}

type PartnerRecentEvent = {
  kind:
    | 'command.request'
    | 'command.result'
    | 'chargingprofile'
    | 'session'
    | 'cdr'
    | 'tariff'
    | 'location'
    | 'token'
    | 'credential'
    | 'partner'
  topic: string
  module?: string
  direction?: 'INBOUND' | 'OUTBOUND'
  occurredAt: string
  partnerId: string
  requestId?: string
  correlationId?: string
  command?: string
  result?: string
  eventType?: string
  responseUrl?: string
  sessionId?: string
  cdrId?: string
  tariffId?: string
  locationId?: string
  tokenUid?: string
  tokenType?: string
  evseUid?: string
  connectorId?: string
  status?: string
  message?: string
}

type RecordModuleEventArgs = {
  event: OcpiEvent
  topic: string
  kind:
    | 'chargingprofile'
    | 'session'
    | 'cdr'
    | 'tariff'
    | 'location'
    | 'token'
    | 'credential'
    | 'partner'
  counter: CounterMetric
  lastField:
    | 'lastChargingProfileEventAt'
    | 'lastSessionEventAt'
    | 'lastCdrEventAt'
    | 'lastTariffEventAt'
    | 'lastLocationEventAt'
    | 'lastTokenEventAt'
    | 'lastCredentialEventAt'
    | 'lastPartnerEventAt'
  latestTypeField:
    | 'latestChargingProfileEventType'
    | 'latestSessionEventType'
    | 'latestCdrEventType'
    | 'latestTariffEventType'
    | 'latestLocationEventType'
    | 'latestTokenEventType'
    | 'latestCredentialEventType'
    | 'latestPartnerEventType'
}

@Injectable()
export class PartnerObservabilityService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService
  ) {}

  async ingestMessage(topic: string, rawMessage: string): Promise<void> {
    const parsed = JSON.parse(rawMessage) as Record<string, unknown>
    if (topic === KAFKA_TOPICS.ocpiCommandRequests) {
      await this.recordCommandRequest(parsed as unknown as OcpiCommandRequest)
      return
    }

    if (topic === KAFKA_TOPICS.ocpiCommandEvents) {
      await this.recordCommandResult(parsed as unknown as OcpiCommandEvent)
      return
    }

    if (topic === KAFKA_TOPICS.ocpiChargingProfileEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'chargingprofile',
        counter: 'chargingProfileEvents',
        lastField: 'lastChargingProfileEventAt',
        latestTypeField: 'latestChargingProfileEventType',
      })
      return
    }

    if (topic === KAFKA_TOPICS.ocpiSessionEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'session',
        counter: 'sessionEvents',
        lastField: 'lastSessionEventAt',
        latestTypeField: 'latestSessionEventType',
      })
      return
    }

    if (topic === KAFKA_TOPICS.ocpiCdrEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'cdr',
        counter: 'cdrEvents',
        lastField: 'lastCdrEventAt',
        latestTypeField: 'latestCdrEventType',
      })
      return
    }

    if (topic === KAFKA_TOPICS.ocpiTariffEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'tariff',
        counter: 'tariffEvents',
        lastField: 'lastTariffEventAt',
        latestTypeField: 'latestTariffEventType',
      })
      return
    }

    if (topic === KAFKA_TOPICS.ocpiLocationEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'location',
        counter: 'locationEvents',
        lastField: 'lastLocationEventAt',
        latestTypeField: 'latestLocationEventType',
      })
      return
    }

    if (topic === KAFKA_TOPICS.ocpiTokenEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'token',
        counter: 'tokenEvents',
        lastField: 'lastTokenEventAt',
        latestTypeField: 'latestTokenEventType',
      })
      return
    }

    if (topic === KAFKA_TOPICS.ocpiCredentialEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'credential',
        counter: 'credentialEvents',
        lastField: 'lastCredentialEventAt',
        latestTypeField: 'latestCredentialEventType',
      })
      return
    }

    if (topic === KAFKA_TOPICS.ocpiPartnerEvents) {
      await this.recordModuleEvent({
        event: parsed as unknown as OcpiEvent,
        topic,
        kind: 'partner',
        counter: 'partnerEvents',
        lastField: 'lastPartnerEventAt',
        latestTypeField: 'latestPartnerEventType',
      })
    }
  }

  async listPartnerObservability(limit?: number): Promise<PartnerObservabilitySummary[]> {
    const partnerIds = await this.redis.getClient().smembers(this.partnersKey())
    const summaries = await Promise.all(
      partnerIds.map((partnerId) => this.loadSummary(partnerId))
    )

    return summaries
      .sort((left, right) => this.sortByMostRecent(left.lastActivityAt, right.lastActivityAt))
      .slice(0, this.normalizeLimit(limit, partnerIds.length || 25))
  }

  async getPartnerObservability(partnerId: string, limit?: number): Promise<{
    summary: PartnerObservabilitySummary
    recentEvents: PartnerRecentEvent[]
  }> {
    const normalizedPartnerId = this.normalizePartnerId(partnerId)
    const [summary, events] = await Promise.all([
      this.loadSummary(normalizedPartnerId),
      this.redis.getClient().lrange(
        this.recentEventsKey(normalizedPartnerId),
        0,
        this.normalizeLimit(limit, this.recentEventLimit()) - 1
      ),
    ])

    return {
      summary,
      recentEvents: events
        .map((entry) => this.parseRecentEvent(entry))
        .filter((entry): entry is PartnerRecentEvent => entry !== null),
    }
  }

  private async recordCommandRequest(event: OcpiCommandRequest): Promise<void> {
    const partnerId = this.normalizePartnerId(event.partnerId)
    const occurredAt = this.normalizeTimestamp(event.requestedAt)

    await this.ensurePartnerTracked(partnerId)
    await this.incrementCounter(partnerId, 'commandRequests')
    await this.updateSummaryFields(partnerId, {
      lastActivityAt: occurredAt,
      lastCommandRequestAt: occurredAt,
      latestCommand: event.command,
    })
    await this.appendRecentEvent(partnerId, {
      kind: 'command.request',
      topic: KAFKA_TOPICS.ocpiCommandRequests,
      module: 'commands',
      direction: 'INBOUND',
      occurredAt,
      partnerId,
      requestId: event.requestId,
      command: event.command,
      responseUrl: event.responseUrl,
      message: this.extractMessage(event.payload),
    })
  }

  private async recordCommandResult(event: OcpiCommandEvent): Promise<void> {
    const partnerId = this.normalizePartnerId(event.partnerId)
    const occurredAt = this.normalizeTimestamp(event.occurredAt)
    const result = this.normalizeResult(event.result)

    await this.ensurePartnerTracked(partnerId)
    await this.incrementCounter(partnerId, 'commandResults')
    await this.incrementCounter(partnerId, `command${result}`)
    await this.updateSummaryFields(partnerId, {
      lastActivityAt: occurredAt,
      lastCommandResultAt: occurredAt,
      latestCommand: event.command,
      latestCommandResult: result,
    })
    await this.appendRecentEvent(partnerId, {
      kind: 'command.result',
      topic: KAFKA_TOPICS.ocpiCommandEvents,
      module: 'commands',
      direction: 'OUTBOUND',
      occurredAt,
      partnerId,
      requestId: event.requestId,
      command: event.command,
      result,
      message: this.extractMessage(event.payload),
    })
  }

  private async recordModuleEvent(args: RecordModuleEventArgs): Promise<void> {
    const partnerId = this.normalizePartnerId(args.event.partnerId)
    const occurredAt = this.normalizeTimestamp(args.event.occurredAt)
    const payload = this.ensureRecord(args.event.payload)

    await this.ensurePartnerTracked(partnerId)
    await this.incrementCounter(partnerId, args.counter)
    await this.updateSummaryFields(partnerId, {
      lastActivityAt: occurredAt,
      [args.lastField]: occurredAt,
      [args.latestTypeField]: args.event.eventType || null,
    })
    await this.appendRecentEvent(partnerId, {
      kind: args.kind,
      topic: args.topic,
      module: args.event.module,
      direction: args.event.direction,
      occurredAt,
      partnerId,
      correlationId: args.event.correlationId,
      requestId: this.extractString(payload.requestId),
      eventType: args.event.eventType,
      sessionId: this.extractString(payload.sessionId),
      cdrId: this.extractString(payload.cdrId),
      tariffId: this.extractString(payload.tariffId),
      locationId: this.extractString(payload.locationId),
      tokenUid: this.extractString(payload.tokenUid),
      tokenType: this.extractString(payload.tokenType),
      evseUid: this.extractString(payload.evseUid),
      connectorId: this.extractString(payload.connectorId),
      status: this.extractString(payload.status),
      message: this.extractMessage(payload),
    })
  }

  private async ensurePartnerTracked(partnerId: string): Promise<void> {
    await this.redis.getClient().sadd(this.partnersKey(), partnerId)
  }

  private async incrementCounter(partnerId: string, metric: CounterMetric): Promise<void> {
    await this.redis.getClient().hincrby(this.summaryKey(partnerId), metric, 1)
  }

  private async updateSummaryFields(
    partnerId: string,
    fields: Record<string, string | null>
  ): Promise<void> {
    const payload = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    ) as Record<string, string | null>
    if (Object.keys(payload).length === 0) return
    await this.redis.getClient().hset(this.summaryKey(partnerId), payload)
  }

  private async appendRecentEvent(partnerId: string, event: PartnerRecentEvent): Promise<void> {
    const client = this.redis.getClient()
    await client.lpush(this.recentEventsKey(partnerId), JSON.stringify(event))
    await client.ltrim(this.recentEventsKey(partnerId), 0, this.recentEventLimit() - 1)
  }

  private async loadSummary(partnerId: string): Promise<PartnerObservabilitySummary> {
    const raw = await this.redis.getClient().hgetall(this.summaryKey(partnerId))
    return {
      partnerId,
      lastActivityAt: this.parseNullableString(raw.lastActivityAt),
      lastCommandRequestAt: this.parseNullableString(raw.lastCommandRequestAt),
      lastCommandResultAt: this.parseNullableString(raw.lastCommandResultAt),
      lastChargingProfileEventAt: this.parseNullableString(raw.lastChargingProfileEventAt),
      lastSessionEventAt: this.parseNullableString(raw.lastSessionEventAt),
      lastCdrEventAt: this.parseNullableString(raw.lastCdrEventAt),
      lastTariffEventAt: this.parseNullableString(raw.lastTariffEventAt),
      lastLocationEventAt: this.parseNullableString(raw.lastLocationEventAt),
      lastTokenEventAt: this.parseNullableString(raw.lastTokenEventAt),
      lastCredentialEventAt: this.parseNullableString(raw.lastCredentialEventAt),
      lastPartnerEventAt: this.parseNullableString(raw.lastPartnerEventAt),
      latestCommand: this.parseNullableString(raw.latestCommand),
      latestCommandResult: this.parseNullableString(raw.latestCommandResult),
      latestChargingProfileEventType: this.parseNullableString(raw.latestChargingProfileEventType),
      latestSessionEventType: this.parseNullableString(raw.latestSessionEventType),
      latestCdrEventType: this.parseNullableString(raw.latestCdrEventType),
      latestTariffEventType: this.parseNullableString(raw.latestTariffEventType),
      latestLocationEventType: this.parseNullableString(raw.latestLocationEventType),
      latestTokenEventType: this.parseNullableString(raw.latestTokenEventType),
      latestCredentialEventType: this.parseNullableString(raw.latestCredentialEventType),
      latestPartnerEventType: this.parseNullableString(raw.latestPartnerEventType),
      counts: {
        commandRequests: this.parseCount(raw.commandRequests),
        commandResults: this.parseCount(raw.commandResults),
        commandAccepted: this.parseCount(raw.commandAccepted),
        commandRejected: this.parseCount(raw.commandRejected),
        commandFailed: this.parseCount(raw.commandFailed),
        commandTimeout: this.parseCount(raw.commandTimeout),
        chargingProfileEvents: this.parseCount(raw.chargingProfileEvents),
        sessionEvents: this.parseCount(raw.sessionEvents),
        cdrEvents: this.parseCount(raw.cdrEvents),
        tariffEvents: this.parseCount(raw.tariffEvents),
        locationEvents: this.parseCount(raw.locationEvents),
        tokenEvents: this.parseCount(raw.tokenEvents),
        credentialEvents: this.parseCount(raw.credentialEvents),
        partnerEvents: this.parseCount(raw.partnerEvents),
      },
    }
  }

  private partnersKey(): string {
    return 'observability:partners'
  }

  private summaryKey(partnerId: string): string {
    return `observability:partner:${partnerId}:summary`
  }

  private recentEventsKey(partnerId: string): string {
    return `observability:partner:${partnerId}:events`
  }

  private recentEventLimit(): number {
    const configured = this.config.get<number>('observability.partnerRecentEventLimit')
    if (!Number.isFinite(configured) || (configured as number) <= 0) {
      return 25
    }
    return Math.floor(configured as number)
  }

  private normalizeLimit(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value) || (value as number) <= 0) {
      return Math.max(1, fallback)
    }
    return Math.min(100, Math.max(1, Math.floor(value as number)))
  }

  private normalizePartnerId(value?: string | null): string {
    const trimmed = value?.trim()
    return trimmed ? trimmed : 'unknown'
  }

  private normalizeTimestamp(value?: string | null): string {
    if (!value) return new Date().toISOString()
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString()
    }
    return parsed.toISOString()
  }

  private normalizeResult(value?: string | null): 'Accepted' | 'Rejected' | 'Failed' | 'Timeout' {
    const normalized = value?.trim().toUpperCase()
    if (normalized === 'ACCEPTED') return 'Accepted'
    if (normalized === 'REJECTED') return 'Rejected'
    if (normalized === 'TIMEOUT') return 'Timeout'
    return 'Failed'
  }

  private parseNullableString(value: string | undefined): string | null {
    if (!value) return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private parseCount(value: string | undefined): number {
    const parsed = Number(value || '0')
    return Number.isFinite(parsed) ? parsed : 0
  }

  private parseRecentEvent(value: string): PartnerRecentEvent | null {
    try {
      return JSON.parse(value) as PartnerRecentEvent
    } catch {
      return null
    }
  }

  private sortByMostRecent(left: string | null, right: string | null): number {
    const leftTime = left ? Date.parse(left) : 0
    const rightTime = right ? Date.parse(right) : 0
    return rightTime - leftTime
  }

  private ensureRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
    return {}
  }

  private extractMessage(value: unknown): string | undefined {
    const payload = this.ensureRecord(value)
    return this.extractString(payload.message) || this.extractString(payload.status_message)
  }

  private extractString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}

export type { PartnerObservabilitySummary }
