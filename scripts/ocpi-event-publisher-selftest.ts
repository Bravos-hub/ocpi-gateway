import { KAFKA_TOPICS } from '../src/contracts/kafka-topics'
import { OcpiEventPublisherService } from '../src/modules/ocpi/core/ocpi-event-publisher.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function main(): Promise<void> {
  const published: Array<{ topic: string; message: string; key?: string }> = []
  const publisher = new OcpiEventPublisherService({
    publish: async (topic: string, message: string, key?: string) => {
      published.push({ topic, message, key })
    },
  } as never)

  await publisher.publishCommandRequest({
    requestId: 'req-1',
    partnerId: 'partner-1',
    command: 'START_SESSION',
    responseUrl: 'https://partner.example.com/commands/START_SESSION/req-1',
    payload: { location_id: 'LOC-1', evse_uid: 'EVSE-1' },
    requestedAt: '2026-03-29T22:00:00.000Z',
  })

  await publisher.publishCommandResult({
    requestId: 'req-1',
    partnerId: 'partner-1',
    command: 'START_SESSION',
    result: 'ACCEPTED',
    occurredAt: '2026-03-29T22:00:05.000Z',
    payload: { message: 'Accepted by CPO' },
  })

  await publisher.publishChargingProfileEvent({
    eventType: 'ocpi.chargingprofile.set.request',
    correlationId: 'corr-1',
    partnerId: 'partner-1',
    role: 'emsp',
    sessionId: 'sess-1',
    requestId: 'cp-req-1',
    payload: { limit: 16 },
    occurredAt: '2026-03-29T22:01:00.000Z',
  })

  await publisher.publishSessionEvent({
    eventType: 'ocpi.session.import.upsert',
    role: 'emsp',
    direction: 'INBOUND',
    partnerId: 'partner-1',
    correlationId: 'corr-2',
    requestId: 'sess-req-1',
    occurredAt: '2026-03-29T22:02:00.000Z',
    countryCode: 'US',
    partyId: 'AAA',
    payload: { sessionId: 'sess-1', status: 'ACTIVE' },
    key: 'sess-1',
  })

  await publisher.publishCdrEvent({
    eventType: 'ocpi.cdr.import.create',
    role: 'emsp',
    direction: 'INBOUND',
    partnerId: 'partner-1',
    correlationId: 'corr-3',
    requestId: 'cdr-req-1',
    occurredAt: '2026-03-29T22:03:00.000Z',
    countryCode: 'US',
    partyId: 'AAA',
    payload: { cdrId: 'cdr-1', sessionId: 'sess-1' },
    key: 'cdr-1',
  })

  await publisher.publishTariffEvent({
    eventType: 'ocpi.tariff.export.list',
    role: 'emsp',
    direction: 'OUTBOUND',
    partnerId: 'partner-1',
    correlationId: 'corr-4',
    requestId: 'tariff-req-1',
    occurredAt: '2026-03-29T22:04:00.000Z',
    payload: { count: 2 },
    key: 'tariff-req-1',
  })

  await publisher.publishLocationEvent({
    eventType: 'ocpi.location.import.patch',
    role: 'emsp',
    direction: 'INBOUND',
    partnerId: 'partner-1',
    correlationId: 'corr-5',
    requestId: 'loc-req-1',
    occurredAt: '2026-03-29T22:05:00.000Z',
    countryCode: 'US',
    partyId: 'AAA',
    payload: {
      locationId: 'LOC-1',
      evseUid: 'EVSE-1',
      connectorId: '1',
      objectType: 'CONNECTOR',
    },
    key: 'LOC-1',
  })

  await publisher.publishTokenEvent({
    eventType: 'ocpi.token.authorize.result',
    role: 'emsp',
    direction: 'INBOUND',
    partnerId: 'partner-1',
    correlationId: 'corr-6',
    requestId: 'token-req-1',
    occurredAt: '2026-03-29T22:06:00.000Z',
    countryCode: 'US',
    partyId: 'AAA',
    payload: { tokenUid: 'tok-1', tokenType: 'RFID', allowed: 'ALLOWED' },
    key: 'tok-1',
  })

  await publisher.publishCredentialEvent({
    eventType: 'ocpi.credentials.update',
    role: 'emsp',
    direction: 'INBOUND',
    partnerId: 'partner-1',
    correlationId: 'corr-7',
    requestId: 'cred-req-1',
    occurredAt: '2026-03-29T22:07:00.000Z',
    countryCode: 'US',
    partyId: 'AAA',
    payload: { routeVersion: '2.2.1', discoveredVersion: '2.2.1' },
    key: 'cred-req-1',
  })

  assert(published.length === 9, 'expected nine Kafka messages to be published')
  assert(
    published[0]?.topic === KAFKA_TOPICS.ocpiCommandRequests,
    'expected first message on ocpi.command.requests'
  )
  assert(
    published[1]?.topic === KAFKA_TOPICS.ocpiCommandEvents,
    'expected second message on ocpi.command.events'
  )
  assert(
    published[2]?.topic === KAFKA_TOPICS.ocpiChargingProfileEvents,
    'expected third message on ocpi.chargingprofile.events'
  )
  assert(
    published[3]?.topic === KAFKA_TOPICS.ocpiSessionEvents,
    'expected fourth message on ocpi.session.events'
  )
  assert(
    published[4]?.topic === KAFKA_TOPICS.ocpiCdrEvents,
    'expected fifth message on ocpi.cdr.events'
  )
  assert(
    published[5]?.topic === KAFKA_TOPICS.ocpiTariffEvents,
    'expected sixth message on ocpi.tariff.events'
  )
  assert(
    published[6]?.topic === KAFKA_TOPICS.ocpiLocationEvents,
    'expected seventh message on ocpi.location.events'
  )
  assert(
    published[7]?.topic === KAFKA_TOPICS.ocpiTokenEvents,
    'expected eighth message on ocpi.token.events'
  )
  assert(
    published[8]?.topic === KAFKA_TOPICS.ocpiCredentialEvents,
    'expected ninth message on ocpi.credentials.events'
  )

  const commandRequest = JSON.parse(published[0]?.message || '{}') as Record<string, unknown>
  assert(commandRequest.requestId === 'req-1', 'expected command request id to be preserved')
  assert(commandRequest.partnerId === 'partner-1', 'expected command request partner id')
  assert(commandRequest.command === 'START_SESSION', 'expected command request command')
  assert(
    commandRequest.responseUrl === 'https://partner.example.com/commands/START_SESSION/req-1',
    'expected command request responseUrl'
  )

  const commandResult = JSON.parse(published[1]?.message || '{}') as Record<string, unknown>
  assert(commandResult.result === 'ACCEPTED', 'expected command result status')
  assert(commandResult.command === 'START_SESSION', 'expected command result command')

  const chargingProfileEvent = JSON.parse(published[2]?.message || '{}') as Record<string, unknown>
  assert(typeof chargingProfileEvent.eventId === 'string', 'expected charging profile event id')
  assert(
    chargingProfileEvent.eventType === 'ocpi.chargingprofile.set.request',
    'expected charging profile event type'
  )
  assert(chargingProfileEvent.module === 'chargingprofiles', 'expected charging profile module')
  assert(chargingProfileEvent.direction === 'INBOUND', 'expected charging profile direction')
  const chargingProfilePayload = chargingProfileEvent.payload as Record<string, unknown> | undefined
  assert(chargingProfilePayload?.sessionId === 'sess-1', 'expected charging profile session id')
  assert(chargingProfilePayload?.requestId === 'cp-req-1', 'expected charging profile request id')

  const sessionEvent = JSON.parse(published[3]?.message || '{}') as Record<string, unknown>
  assert(sessionEvent.module === 'sessions', 'expected session module')
  assert(sessionEvent.direction === 'INBOUND', 'expected session direction')
  assert(sessionEvent.countryCode === 'US', 'expected session countryCode')
  const sessionPayload = sessionEvent.payload as Record<string, unknown> | undefined
  assert(sessionPayload?.sessionId === 'sess-1', 'expected session id in payload')

  const cdrEvent = JSON.parse(published[4]?.message || '{}') as Record<string, unknown>
  assert(cdrEvent.module === 'cdrs', 'expected cdr module')
  const cdrPayload = cdrEvent.payload as Record<string, unknown> | undefined
  assert(cdrPayload?.cdrId === 'cdr-1', 'expected cdr id in payload')

  const tariffEvent = JSON.parse(published[5]?.message || '{}') as Record<string, unknown>
  assert(tariffEvent.module === 'tariffs', 'expected tariff module')
  assert(tariffEvent.direction === 'OUTBOUND', 'expected tariff direction')

  const locationEvent = JSON.parse(published[6]?.message || '{}') as Record<string, unknown>
  assert(locationEvent.module === 'locations', 'expected location module')
  const locationPayload = locationEvent.payload as Record<string, unknown> | undefined
  assert(locationPayload?.locationId === 'LOC-1', 'expected location id in payload')
  assert(locationPayload?.connectorId === '1', 'expected connector id in payload')

  const tokenEvent = JSON.parse(published[7]?.message || '{}') as Record<string, unknown>
  assert(tokenEvent.module === 'tokens', 'expected token module')
  const tokenPayload = tokenEvent.payload as Record<string, unknown> | undefined
  assert(tokenPayload?.tokenUid === 'tok-1', 'expected token uid in payload')
  assert(tokenPayload?.allowed === 'ALLOWED', 'expected token authorization result')

  const credentialEvent = JSON.parse(published[8]?.message || '{}') as Record<string, unknown>
  assert(credentialEvent.module === 'credentials', 'expected credentials module')
  const credentialPayload = credentialEvent.payload as Record<string, unknown> | undefined
  assert(credentialPayload?.requestId === 'cred-req-1', 'expected credential request id')
  assert(
    credentialPayload?.discoveredVersion === '2.2.1',
    'expected credential discovered version'
  )

  console.log(JSON.stringify({ status: 'ok', test: 'ocpi-event-publisher-selftest' }))
}

void main()
