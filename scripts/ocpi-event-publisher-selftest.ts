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

  assert(published.length === 3, 'expected three Kafka messages to be published')
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

  console.log(JSON.stringify({ status: 'ok', test: 'ocpi-event-publisher-selftest' }))
}

void main()
