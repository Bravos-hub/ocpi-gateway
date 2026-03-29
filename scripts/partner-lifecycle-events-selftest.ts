import { KAFKA_TOPICS } from '../src/contracts/kafka-topics'
import { PartnersService } from '../src/modules/partners/partners.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

async function main(): Promise<void> {
  const published: Array<{ topic: string; message: string; key?: string }> = []
  const partners = new Map<string, Record<string, unknown>>([
    [
      'partner-existing',
      {
        id: 'partner-existing',
        name: 'Existing Partner',
        partyId: 'AAA',
        countryCode: 'US',
        role: 'EMSP',
        status: 'PENDING',
        version: '2.2.1',
      },
    ],
  ])

  const backend = {
    async post(path: string, payload: Record<string, unknown>) {
      if (path !== '/internal/ocpi/partners') {
        throw new Error(`unexpected post path: ${path}`)
      }

      const id = payload.tokenA ? 'partner-existing' : 'partner-new'
      const record = {
        id,
        status: 'ACTIVE',
        version: '2.2.1',
        ...payload,
      }
      partners.set(id, record)
      return record
    },
    async patch(path: string, payload: Record<string, unknown>) {
      const id = path.split('/').pop() || ''
      const existing = partners.get(id)
      if (!existing) {
        throw new Error(`unknown partner id: ${id}`)
      }
      const record = { ...existing, ...payload, id }
      partners.set(id, record)
      return record
    },
    async get(path: string, params?: Record<string, unknown>) {
      if (path !== '/internal/ocpi/partners') {
        throw new Error(`unexpected get path: ${path}`)
      }
      if (params?.token === 'token-a') {
        return [partners.get('partner-existing')]
      }
      return [...partners.values()]
    },
  }

  const service = new PartnersService(
    backend as never,
    {
      publish: async (topic: string, message: string, key?: string) => {
        published.push({ topic, message, key })
      },
    } as never,
    {
      getStatus: () => ({ enabled: true }),
    } as never,
    {
      listPartnerObservability: async () => [],
      getPartnerObservability: async () => ({
        summary: { partnerId: 'partner-existing' },
        recentEvents: [],
      }),
    } as never
  )

  await service.create(
    {
      name: 'New Partner',
      partyId: 'BBB',
      countryCode: 'UG',
      role: 'CPO',
      versionsUrl: 'https://example.com/versions',
    },
    {
      requestId: 'req-1',
      correlationId: 'corr-1',
    }
  )

  await service.update(
    'partner-existing',
    {
      status: 'ACTIVE',
      versionsUrl: 'https://existing.example.com/versions',
    },
    {
      requestId: 'req-2',
      correlationId: 'corr-2',
    }
  )

  await service.suspend('partner-existing', {
    requestId: 'req-3',
    correlationId: 'corr-3',
  })

  await service.upsertFromCredentials({
    tokenA: 'token-a',
    tokenB: 'token-b',
    tokenC: 'token-c',
    partyId: 'AAA',
    countryCode: 'US',
    role: 'EMSP',
    name: 'Existing Partner',
    versionsUrl: 'https://existing.example.com/versions',
    version: '2.2.1',
    endpoints: [{ identifier: 'credentials' }],
    roles: [{ role: 'EMSP' }],
    requestId: 'req-4',
    correlationId: 'corr-4',
  })

  assert(published.length === 4, 'expected four partner lifecycle events')
  assert(
    published.every((entry) => entry.topic === KAFKA_TOPICS.ocpiPartnerEvents),
    'expected all lifecycle events on ocpi.partner.events'
  )

  const createEvent = JSON.parse(published[0]?.message || '{}') as Record<string, unknown>
  assert(createEvent.eventType === 'ocpi.partner.admin.create', 'expected admin create event type')
  assert(createEvent.partnerId === 'partner-new', 'expected created partner id')

  const updateEvent = JSON.parse(published[1]?.message || '{}') as Record<string, unknown>
  assert(updateEvent.eventType === 'ocpi.partner.admin.update', 'expected admin update event type')
  const updatePayload = updateEvent.payload as Record<string, unknown> | undefined
  assert(Array.isArray(updatePayload?.updatedFields), 'expected updatedFields in admin update')

  const suspendEvent = JSON.parse(published[2]?.message || '{}') as Record<string, unknown>
  assert(
    suspendEvent.eventType === 'ocpi.partner.admin.suspend',
    'expected admin suspend event type'
  )

  const credentialEvent = JSON.parse(published[3]?.message || '{}') as Record<string, unknown>
  assert(
    credentialEvent.eventType === 'ocpi.partner.credentials.update',
    'expected credential lifecycle event type'
  )
  const credentialPayload = credentialEvent.payload as Record<string, unknown> | undefined
  assert(credentialPayload?.source === 'credentials', 'expected credential source payload')

  console.log(JSON.stringify({ status: 'ok', test: 'partner-lifecycle-events-selftest' }))
}

void main()
