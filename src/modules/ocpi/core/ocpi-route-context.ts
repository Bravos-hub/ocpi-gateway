export type OcpiRoutingHeaders = {
  toPartyId?: string
  toCountryCode?: string
  fromPartyId?: string
  fromCountryCode?: string
}

export type OcpiRequestContext = {
  requestId: string
  correlationId: string
  routing: OcpiRoutingHeaders
}

export type OcpiPartnerInfo = {
  id: string
  role?: string | null
  status?: string | null
  roles?: Array<Record<string, unknown>> | null
}

export type OcpiAuthContext = {
  token: string
  partner: OcpiPartnerInfo
}
