import { ConfigService } from '@nestjs/config'
import { KAFKA_TOPICS } from '../src/contracts/kafka-topics'
import { PartnerObservabilityService } from '../src/modules/partners/partner-observability.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

class FakeRedisClient {
  private readonly hashes = new Map<string, Map<string, string>>()
  private readonly lists = new Map<string, string[]>()
  private readonly sets = new Map<string, Set<string>>()

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) || new Set<string>())]
  }

  async sadd(key: string, value: string): Promise<number> {
    const set = this.sets.get(key) || new Set<string>()
    const before = set.size
    set.add(value)
    this.sets.set(key, set)
    return set.size > before ? 1 : 0
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key)
    if (!hash) return {}
    return Object.fromEntries(hash.entries())
  }

  async hset(key: string, values: Record<string, string | null>): Promise<number> {
    const hash = this.hashes.get(key) || new Map<string, string>()
    for (const [field, value] of Object.entries(values)) {
      hash.set(field, value === null ? '' : String(value))
    }
    this.hashes.set(key, hash)
    return Object.keys(values).length
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const hash = this.hashes.get(key) || new Map<string, string>()
    const current = Number(hash.get(field) || '0')
    const next = current + increment
    hash.set(field, String(next))
    this.hashes.set(key, hash)
    return next
  }

  async lpush(key: string, value: string): Promise<number> {
    const list = this.lists.get(key) || []
    list.unshift(value)
    this.lists.set(key, list)
    return list.length
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    const list = this.lists.get(key) || []
    this.lists.set(key, list.slice(start, stop + 1))
    return 'OK'
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) || []
    return list.slice(start, stop + 1)
  }
}

async function main(): Promise<void> {
  const redis = new FakeRedisClient()
  const service = new PartnerObservabilityService(
    {
      getClient: () => redis,
    } as never,
    new ConfigService({
      observability: {
        partnerRecentEventLimit: 5,
      },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiCommandRequests,
    JSON.stringify({
      requestId: 'req-1',
      partnerId: 'partner-1',
      command: 'START_SESSION',
      responseUrl: 'https://partner.example.com/commands/req-1',
      payload: { location_id: 'LOC-1' },
      requestedAt: '2026-03-30T08:00:00.000Z',
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiCommandEvents,
    JSON.stringify({
      requestId: 'req-1',
      partnerId: 'partner-1',
      command: 'START_SESSION',
      result: 'ACCEPTED',
      occurredAt: '2026-03-30T08:00:05.000Z',
      payload: { message: 'Accepted by CPO' },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiChargingProfileEvents,
    JSON.stringify({
      eventId: 'evt-1',
      eventType: 'ocpi.chargingprofile.result',
      source: 'ocpi-gateway',
      occurredAt: '2026-03-30T08:01:00.000Z',
      correlationId: 'req-2',
      partnerId: 'partner-1',
      role: 'emsp',
      module: 'chargingprofiles',
      direction: 'INBOUND',
      payload: {
        requestId: 'req-2',
        sessionId: 'sess-1',
        message: 'Charging profile applied',
      },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiSessionEvents,
    JSON.stringify({
      eventId: 'evt-2',
      eventType: 'ocpi.session.import.upsert',
      source: 'ocpi-gateway',
      occurredAt: '2026-03-30T08:02:00.000Z',
      correlationId: 'req-3',
      partnerId: 'partner-1',
      role: 'emsp',
      module: 'sessions',
      direction: 'INBOUND',
      payload: {
        requestId: 'req-3',
        sessionId: 'sess-1',
        status: 'ACTIVE',
      },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiTariffEvents,
    JSON.stringify({
      eventId: 'evt-3',
      eventType: 'ocpi.tariff.export.list',
      source: 'ocpi-gateway',
      occurredAt: '2026-03-30T08:03:00.000Z',
      correlationId: 'req-4',
      partnerId: 'partner-1',
      role: 'emsp',
      module: 'tariffs',
      direction: 'OUTBOUND',
      payload: {
        requestId: 'req-4',
        count: 2,
      },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiLocationEvents,
    JSON.stringify({
      eventId: 'evt-4',
      eventType: 'ocpi.location.import.patch',
      source: 'ocpi-gateway',
      occurredAt: '2026-03-30T08:04:00.000Z',
      correlationId: 'req-5',
      partnerId: 'partner-1',
      role: 'emsp',
      module: 'locations',
      direction: 'INBOUND',
      payload: {
        requestId: 'req-5',
        locationId: 'LOC-1',
        evseUid: 'EVSE-1',
        connectorId: '1',
      },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiTokenEvents,
    JSON.stringify({
      eventId: 'evt-5',
      eventType: 'ocpi.token.authorize.result',
      source: 'ocpi-gateway',
      occurredAt: '2026-03-30T08:05:00.000Z',
      correlationId: 'req-6',
      partnerId: 'partner-1',
      role: 'emsp',
      module: 'tokens',
      direction: 'INBOUND',
      payload: {
        requestId: 'req-6',
        tokenUid: 'tok-1',
        tokenType: 'RFID',
        allowed: 'ALLOWED',
      },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiCredentialEvents,
    JSON.stringify({
      eventId: 'evt-6',
      eventType: 'ocpi.credentials.update',
      source: 'ocpi-gateway',
      occurredAt: '2026-03-30T08:06:00.000Z',
      correlationId: 'req-7',
      partnerId: 'partner-1',
      role: 'emsp',
      module: 'credentials',
      direction: 'INBOUND',
      payload: {
        requestId: 'req-7',
        discoveredVersion: '2.2.1',
      },
    })
  )

  await service.ingestMessage(
    KAFKA_TOPICS.ocpiPartnerEvents,
    JSON.stringify({
      eventId: 'evt-7',
      eventType: 'ocpi.partner.credentials.update',
      source: 'ocpi-gateway',
      occurredAt: '2026-03-30T08:07:00.000Z',
      correlationId: 'req-8',
      partnerId: 'partner-1',
      role: 'emsp',
      module: 'partners',
      direction: 'INBOUND',
      payload: {
        requestId: 'req-8',
        status: 'ACTIVE',
        source: 'credentials',
      },
    })
  )

  const overview = await service.listPartnerObservability()
  assert(overview.length === 1, 'expected one partner overview entry')
  assert(overview[0]?.partnerId === 'partner-1', 'expected partner-1 in overview')
  assert(overview[0]?.counts.commandRequests === 1, 'expected one command request')
  assert(overview[0]?.counts.commandResults === 1, 'expected one command result')
  assert(overview[0]?.counts.commandAccepted === 1, 'expected one accepted command result')
  assert(
    overview[0]?.counts.chargingProfileEvents === 1,
    'expected one charging profile event'
  )
  assert(overview[0]?.counts.sessionEvents === 1, 'expected one session event')
  assert(overview[0]?.counts.tariffEvents === 1, 'expected one tariff event')
  assert(overview[0]?.counts.locationEvents === 1, 'expected one location event')
  assert(overview[0]?.counts.tokenEvents === 1, 'expected one token event')
  assert(overview[0]?.counts.credentialEvents === 1, 'expected one credential event')
  assert(overview[0]?.counts.partnerEvents === 1, 'expected one partner event')
  assert(
    overview[0]?.latestChargingProfileEventType === 'ocpi.chargingprofile.result',
    'expected latest charging profile event type'
  )
  assert(
    overview[0]?.latestSessionEventType === 'ocpi.session.import.upsert',
    'expected latest session event type'
  )
  assert(
    overview[0]?.latestTariffEventType === 'ocpi.tariff.export.list',
    'expected latest tariff event type'
  )
  assert(
    overview[0]?.latestLocationEventType === 'ocpi.location.import.patch',
    'expected latest location event type'
  )
  assert(
    overview[0]?.latestTokenEventType === 'ocpi.token.authorize.result',
    'expected latest token event type'
  )
  assert(
    overview[0]?.latestCredentialEventType === 'ocpi.credentials.update',
    'expected latest credential event type'
  )
  assert(
    overview[0]?.latestPartnerEventType === 'ocpi.partner.credentials.update',
    'expected latest partner event type'
  )

  const detail = await service.getPartnerObservability('partner-1', 5)
  assert(detail.recentEvents.length === 5, 'expected recent events to be trimmed to limit')
  assert(
    detail.recentEvents[0]?.kind === 'partner',
    'expected most recent event to be partner'
  )
  assert(
    detail.recentEvents[1]?.kind === 'credential',
    'expected second most recent event to be credential'
  )
  assert(
    detail.recentEvents[2]?.kind === 'token',
    'expected third most recent event to be token'
  )
  assert(
    detail.recentEvents[3]?.kind === 'location',
    'expected fourth most recent event to be location'
  )
  assert(
    detail.recentEvents[4]?.kind === 'tariff',
    'expected fifth most recent event to be tariff'
  )

  console.log(JSON.stringify({ status: 'ok', test: 'partner-observability-selftest' }))
}

void main()
