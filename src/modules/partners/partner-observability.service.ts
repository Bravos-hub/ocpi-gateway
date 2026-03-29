import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OcpiCommandEvent, OcpiCommandRequest, OcpiEvent } from '../../contracts/events'
import { KAFKA_TOPICS } from '../../contracts/kafka-topics'
import { RedisService } from '../../platform/redis.service'

type PartnerObservabilitySummary = {
  partnerId: string
  lastActivityAt: string | null
  lastCommandRequestAt: string | null
  lastCommandResultAt: string | null
  lastChargingProfileEventAt: string | null
  latestCommand: string | null
  latestCommandResult: string | null
  latestChargingProfileEventType: string | null
  counts: {
    commandRequests: number
    commandResults: number
    commandAccepted: number
    commandRejected: number
    commandFailed: number
    commandTimeout: number
    chargingProfileEvents: number
  }
}

type PartnerRecentEvent = {
  kind: 'command.request' | 'command.result' | 'chargingprofile'
  topic: string
  occurredAt: string
  partnerId: string
  requestId?: string
  correlationId?: string
  command?: string
  result?: string
  eventType?: string
  responseUrl?: string
  sessionId?: string
  message?: string
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
      await this.recordChargingProfileEvent(parsed as unknown as OcpiEvent)
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
      occurredAt,
      partnerId,
      requestId: event.requestId,
      command: event.command,
      result,
      message: this.extractMessage(event.payload),
    })
  }

  private async recordChargingProfileEvent(event: OcpiEvent): Promise<void> {
    const partnerId = this.normalizePartnerId(event.partnerId)
    const occurredAt = this.normalizeTimestamp(event.occurredAt)
    const payload = this.ensureRecord(event.payload)

    await this.ensurePartnerTracked(partnerId)
    await this.incrementCounter(partnerId, 'chargingProfileEvents')
    await this.updateSummaryFields(partnerId, {
      lastActivityAt: occurredAt,
      lastChargingProfileEventAt: occurredAt,
      latestChargingProfileEventType: event.eventType || null,
    })
    await this.appendRecentEvent(partnerId, {
      kind: 'chargingprofile',
      topic: KAFKA_TOPICS.ocpiChargingProfileEvents,
      occurredAt,
      partnerId,
      correlationId: event.correlationId,
      requestId: this.extractString(payload.requestId),
      eventType: event.eventType,
      sessionId: this.extractString(payload.sessionId),
      message: this.extractMessage(payload),
    })
  }

  private async ensurePartnerTracked(partnerId: string): Promise<void> {
    await this.redis.getClient().sadd(this.partnersKey(), partnerId)
  }

  private async incrementCounter(
    partnerId: string,
    metric:
      | 'commandRequests'
      | 'commandResults'
      | 'commandAccepted'
      | 'commandRejected'
      | 'commandFailed'
      | 'commandTimeout'
      | 'chargingProfileEvents'
  ): Promise<void> {
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

  private async appendRecentEvent(
    partnerId: string,
    event: PartnerRecentEvent
  ): Promise<void> {
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
      latestCommand: this.parseNullableString(raw.latestCommand),
      latestCommandResult: this.parseNullableString(raw.latestCommandResult),
      latestChargingProfileEventType: this.parseNullableString(raw.latestChargingProfileEventType),
      counts: {
        commandRequests: this.parseCount(raw.commandRequests),
        commandResults: this.parseCount(raw.commandResults),
        commandAccepted: this.parseCount(raw.commandAccepted),
        commandRejected: this.parseCount(raw.commandRejected),
        commandFailed: this.parseCount(raw.commandFailed),
        commandTimeout: this.parseCount(raw.commandTimeout),
        chargingProfileEvents: this.parseCount(raw.chargingProfileEvents),
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
