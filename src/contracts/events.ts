export type OcpiEvent = {
  eventId: string
  eventType: string
  source: string
  occurredAt: string
  correlationId?: string
  tenantId?: string
  partnerId?: string
  partyId?: string
  countryCode?: string
  role?: string
  module?: string
  direction?: 'INBOUND' | 'OUTBOUND'
  payload?: Record<string, unknown>
}

export type OcpiCommandRequest = {
  requestId: string
  tenantId?: string
  partnerId: string
  command: string
  responseUrl: string
  payload: Record<string, unknown>
  requestedAt: string
}

export type OcpiCommandEvent = {
  requestId: string
  partnerId: string
  command: string
  result: string
  occurredAt: string
  payload?: Record<string, unknown>
}

export type OcpiSessionEvent = {
  partnerId: string
  sessionId: string
  status: string
  occurredAt: string
  payload?: Record<string, unknown>
}

export type OcpiCdrEvent = {
  partnerId: string
  cdrId: string
  sessionId?: string
  occurredAt: string
  payload?: Record<string, unknown>
}

