import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { randomBytes } from 'crypto'
import { PartnersService } from '../partners/partners.service'
import { CredentialsDto } from './dto/credentials.dto'
import {
  OCPI_ALLOWED_ROLES,
  OCPI_STATUS_CODES,
  type OcpiVersion,
} from './core/constants'
import { ocpiError, ocpiSuccess, type OcpiEnvelope } from './core/ocpi-response'
import { OcpiTokenCodecService } from './core/ocpi-token-codec.service'

type OcpiRole = 'cpo' | 'emsp' | 'hub'

type PartnerRecord = {
  id: string
  tokenC?: string | null
  status?: string | null
}

type VersionEndpoint = {
  version: string
  url: string
}

type CapabilityResult =
  | {
      ok: true
      version: OcpiVersion
      endpoints: Record<string, unknown>[]
    }
  | {
      ok: false
      statusCode: number
      message: string
      httpStatus: number
    }

type CredentialsResult = {
  httpStatus: number
  payload: OcpiEnvelope
}

@Injectable()
export class OcpiService {
  constructor(
    private readonly config: ConfigService,
    private readonly partners: PartnersService,
    private readonly tokenCodec: OcpiTokenCodecService
  ) {}

  getVersions(role?: OcpiRole) {
    const normalizedRole = role || 'cpo'
    const baseUrl =
      this.getBaseUrl(normalizedRole) || this.getBaseUrl('cpo') || this.getBaseUrl('emsp')
    const versionBase = baseUrl ? baseUrl.replace(/\/2\.\d+\.\d+$/, '') : ''

    return ocpiSuccess([
      {
        version: '2.2.1',
        url: `${versionBase}/2.2.1`,
      },
      {
        version: '2.1.1',
        url: `${versionBase}/2.1.1`,
      },
    ])
  }

  getVersionDetails(role: OcpiRole, version: OcpiVersion) {
    const baseUrl = this.getBaseUrl(role, version)
    const endpoints = this.getEndpoints(role, baseUrl, version)

    return ocpiSuccess({
      version,
      endpoints,
    })
  }

  async handleCredentialsPost(
    role: string,
    authorization: string | undefined,
    dto: CredentialsDto
  ): Promise<CredentialsResult> {
    const normalizedRole = this.normalizeRole(role)
    if (!normalizedRole) {
      return {
        httpStatus: 400,
        payload: ocpiError(OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS, 'Unsupported role'),
      }
    }

    const partnerMatch = await this.findPartnerFromAuthorization(authorization)
    if (!partnerMatch.partner || !partnerMatch.token) {
      return {
        httpStatus: 401,
        payload: ocpiError(OCPI_STATUS_CODES.UNKNOWN_TOKEN, 'Unknown Token'),
      }
    }

    if ((partnerMatch.partner.status || '').toUpperCase() === 'ACTIVE' && partnerMatch.partner.tokenC) {
      return {
        httpStatus: 405,
        payload: ocpiError(
          OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS,
          'Method not allowed: partner already registered'
        ),
      }
    }

    const capabilities = await this.discoverCapabilities(dto.url, dto.token)
    if (!capabilities.ok) {
      return {
        httpStatus: capabilities.httpStatus,
        payload: ocpiError(capabilities.statusCode, capabilities.message),
      }
    }

    const tokenC = this.generateToken()
    const partnerName = this.getBusinessName(dto)
    const partnerRole = this.getRoleFromCredentials(dto)
    const partyId = this.getPartyId(dto)
    const countryCode = this.getCountryCode(dto)

    if (!partyId || !countryCode) {
      return {
        httpStatus: 400,
        payload: ocpiError(
          OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS,
          'Missing party/country identifiers in credentials roles'
        ),
      }
    }

    await this.partners.upsertFromCredentials({
      tokenA: partnerMatch.token,
      tokenB: dto.token,
      tokenC,
      partyId,
      countryCode,
      role: partnerRole,
      name: partnerName,
      versionsUrl: dto.url,
      roles: dto.roles || null,
      endpoints: capabilities.endpoints,
      version: capabilities.version,
    })

    return { httpStatus: 200, payload: this.credentialsResponse(normalizedRole, tokenC) }
  }

  async handleCredentialsGet(
    role: string,
    authorization: string | undefined
  ): Promise<CredentialsResult> {
    const normalizedRole = this.normalizeRole(role)
    if (!normalizedRole) {
      return {
        httpStatus: 400,
        payload: ocpiError(OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS, 'Unsupported role'),
      }
    }

    const partnerMatch = await this.findPartnerFromAuthorization(authorization)
    if (!partnerMatch.partner || !partnerMatch.token) {
      return {
        httpStatus: 401,
        payload: ocpiError(OCPI_STATUS_CODES.UNKNOWN_TOKEN, 'Unknown Token'),
      }
    }

    const activeToken = partnerMatch.partner.tokenC || partnerMatch.token
    return {
      httpStatus: 200,
      payload: this.credentialsResponse(normalizedRole, activeToken),
    }
  }

  async handleCredentialsPut(
    role: string,
    authorization: string | undefined,
    dto: CredentialsDto
  ): Promise<CredentialsResult> {
    const normalizedRole = this.normalizeRole(role)
    if (!normalizedRole) {
      return {
        httpStatus: 400,
        payload: ocpiError(OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS, 'Unsupported role'),
      }
    }

    const partnerMatch = await this.findPartnerFromAuthorization(authorization)
    if (!partnerMatch.partner) {
      return {
        httpStatus: 405,
        payload: ocpiError(
          OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS,
          'Method not allowed: client is not registered'
        ),
      }
    }

    const capabilities = await this.discoverCapabilities(dto.url, dto.token)
    if (!capabilities.ok) {
      return {
        httpStatus: capabilities.httpStatus,
        payload: ocpiError(capabilities.statusCode, capabilities.message),
      }
    }

    const tokenC = this.generateToken()
    await this.partners.update(partnerMatch.partner.id, {
      tokenB: dto.token,
      tokenC,
      versionsUrl: dto.url,
      status: 'ACTIVE',
      version: capabilities.version,
      endpoints: capabilities.endpoints,
      roles: dto.roles || null,
      lastSyncAt: new Date().toISOString(),
    })

    return {
      httpStatus: 200,
      payload: this.credentialsResponse(normalizedRole, tokenC),
    }
  }

  async handleCredentialsDelete(
    role: string,
    authorization: string | undefined
  ): Promise<CredentialsResult> {
    const normalizedRole = this.normalizeRole(role)
    if (!normalizedRole) {
      return {
        httpStatus: 400,
        payload: ocpiError(OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS, 'Unsupported role'),
      }
    }

    const partnerMatch = await this.findPartnerFromAuthorization(authorization)
    if (!partnerMatch.partner) {
      return {
        httpStatus: 405,
        payload: ocpiError(
          OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS,
          'Method not allowed: client is not registered'
        ),
      }
    }

    await this.partners.suspend(partnerMatch.partner.id)
    return { httpStatus: 200, payload: ocpiSuccess(null) }
  }

  private credentialsResponse(role: OcpiRole, token: string) {
    const partyId = this.config.get<string>('ocpi.partyId') || 'EVZ'
    const countryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    const businessName = this.config.get<string>('ocpi.businessName') || 'EVzone'
    const url = this.getVersionsUrl(role)

    return ocpiSuccess({
      token,
      url,
      party_id: partyId,
      country_code: countryCode,
      business_details: {
        name: businessName,
      },
      roles: [
        {
          role: role.toUpperCase(),
          party_id: partyId,
          country_code: countryCode,
          business_details: {
            name: businessName,
          },
        },
      ],
    })
  }

  private getEndpoints(role: OcpiRole, baseUrl: string, version: OcpiVersion) {
    const senderRole = role === 'cpo' || role === 'hub' ? 'SENDER' : 'RECEIVER'
    const receiverRole = senderRole === 'SENDER' ? 'RECEIVER' : 'SENDER'
    const includeCommands = this.config.get<boolean>('ocpi.enableModuleCommands') ?? true
    const includeChargingProfiles =
      this.config.get<boolean>('ocpi.enableModuleChargingProfiles') ?? true
    const includeHubClientInfo = this.config.get<boolean>('ocpi.enableModuleHubClientInfo') ?? true

    const endpoints: Array<{ identifier: string; role: string; url: string }> = [
      { identifier: 'credentials', role: receiverRole, url: `${baseUrl}/credentials` },
      { identifier: 'tokens', role: receiverRole, url: `${baseUrl}/tokens` },
      { identifier: 'locations', role: senderRole, url: `${baseUrl}/locations` },
      { identifier: 'tariffs', role: senderRole, url: `${baseUrl}/tariffs` },
      { identifier: 'sessions', role: senderRole, url: `${baseUrl}/sessions` },
      { identifier: 'cdrs', role: senderRole, url: `${baseUrl}/cdrs` },
    ]

    if (includeCommands) {
      endpoints.push({ identifier: 'commands', role: receiverRole, url: `${baseUrl}/commands` })
    }

    if (version === '2.2.1' && includeChargingProfiles) {
      endpoints.push({
        identifier: 'chargingprofiles',
        role: receiverRole,
        url: `${baseUrl}/chargingprofiles`,
      })
    }

    if (version === '2.2.1' && includeHubClientInfo) {
      endpoints.push({
        identifier: 'hubclientinfo',
        role: role === 'hub' ? 'SENDER' : 'RECEIVER',
        url: `${baseUrl}/hubclientinfo`,
      })
    }

    if (version === '2.1.1') {
      return endpoints.map(({ role: _role, ...rest }) => rest)
    }

    return endpoints
  }

  private getBaseUrl(role: OcpiRole, version?: OcpiVersion): string {
    if (role === 'hub') {
      return this.replaceVersion(this.config.get<string>('ocpi.baseUrlHub') || '', version)
    }
    if (role === 'emsp') {
      return this.replaceVersion(this.config.get<string>('ocpi.baseUrlEmsp') || '', version)
    }
    return this.replaceVersion(this.config.get<string>('ocpi.baseUrlCpo') || '', version)
  }

  private getVersionsUrl(role?: OcpiRole): string {
    const baseUrl =
      (role ? this.getBaseUrl(role) : '') ||
      this.getBaseUrl('cpo') ||
      this.getBaseUrl('emsp') ||
      this.getBaseUrl('hub')
    if (!baseUrl) return ''
    return baseUrl.replace(/\/2\.\d+\.\d+$/, '/versions')
  }

  private replaceVersion(baseUrl: string, version?: OcpiVersion): string {
    if (!version) return baseUrl
    if (baseUrl.match(/\/2\.\d+\.\d+$/)) {
      return baseUrl.replace(/\/2\.\d+\.\d+$/, `/${version}`)
    }
    return `${baseUrl.replace(/\/$/, '')}/${version}`
  }

  private generateToken(): string {
    return randomBytes(24).toString('hex')
  }

  private getBusinessName(dto: CredentialsDto): string {
    const details = dto.business_details || {}
    const name = (details as { name?: string }).name
    if (name) return name

    const firstRole = (dto.roles || [])[0] as { business_details?: { name?: string } } | undefined
    const roleName = firstRole?.business_details?.name
    if (roleName) return roleName

    return name || dto.party_id || 'OCPI Partner'
  }

  private getPartyId(dto: CredentialsDto): string | null {
    if (dto.party_id) return dto.party_id
    const firstRole = (dto.roles || [])[0] as { party_id?: string } | undefined
    return firstRole?.party_id || null
  }

  private getCountryCode(dto: CredentialsDto): string | null {
    if (dto.country_code) return dto.country_code
    const firstRole = (dto.roles || [])[0] as { country_code?: string } | undefined
    return firstRole?.country_code || null
  }

  private getRoleFromCredentials(dto: CredentialsDto): string {
    const roles = dto.roles || []
    if (roles.length > 0) {
      const roleValue = roles[0] as { role?: string }
      if (roleValue.role) {
        return roleValue.role.toUpperCase()
      }
    }
    return 'OTHER'
  }

  private normalizeRole(role: string): OcpiRole | null {
    const normalized = role.trim().toLowerCase()
    if (!OCPI_ALLOWED_ROLES.has(normalized)) return null
    if (normalized === 'cpo' || normalized === 'emsp' || normalized === 'hub') {
      return normalized
    }
    return 'cpo'
  }

  private async findPartnerFromAuthorization(header: string | undefined): Promise<{
    token: string | null
    partner: PartnerRecord | null
  }> {
    const candidates = this.tokenCodec.parseAuthorizationTokenCandidates(header)
    for (const token of candidates) {
      const partner = (await this.partners.findByToken(token)) as PartnerRecord | null
      if (partner?.id) {
        return { token, partner }
      }
    }

    return { token: null, partner: null }
  }

  private unwrapOcpiData<T>(payload: unknown): T | null {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as { data?: T }).data ?? null
    }
    return payload as T
  }

  private async discoverCapabilities(versionsUrl: string, token: string): Promise<CapabilityResult> {
    const timeoutMs = this.config.get<number>('ocpi.outboundTimeoutMs') || 5000
    const headers = {
      Authorization: this.tokenCodec.formatAuthorizationHeader(token),
    }

    let versions: VersionEndpoint[]
    try {
      const versionsResponse = await axios.get(versionsUrl, { headers, timeout: timeoutMs })
      const versionsPayload = this.unwrapOcpiData<VersionEndpoint[]>(versionsResponse.data)
      versions = Array.isArray(versionsPayload) ? versionsPayload : []
    } catch {
      return {
        ok: false,
        statusCode: OCPI_STATUS_CODES.UNABLE_TO_USE_CLIENT_API,
        message: 'Unable to query client OCPI versions endpoint',
        httpStatus: 502,
      }
    }

    const preferredVersions: OcpiVersion[] = ['2.2.1', '2.1.1']
    const selected = preferredVersions
      .map((version) => versions.find((entry) => entry.version === version))
      .find((entry): entry is VersionEndpoint => !!entry && !!entry.url)

    if (!selected) {
      return {
        ok: false,
        statusCode: OCPI_STATUS_CODES.NO_MATCHING_ENDPOINTS,
        message: 'No matching OCPI version available between parties',
        httpStatus: 200,
      }
    }

    try {
      const detailsResponse = await axios.get(selected.url, { headers, timeout: timeoutMs })
      const detailsPayload = this.unwrapOcpiData<{
        version?: string
        endpoints?: Record<string, unknown>[]
      }>(detailsResponse.data)
      const endpoints = Array.isArray(detailsPayload?.endpoints) ? detailsPayload.endpoints : []
      const endpointIds = new Set(
        endpoints
          .map((item) => item?.identifier)
          .filter((item): item is string => typeof item === 'string')
      )

      const hasCredentials = endpointIds.has('credentials')
      const hasAtLeastOneFunctional = Array.from(endpointIds).some((id) => id !== 'credentials')

      if (!hasCredentials || !hasAtLeastOneFunctional) {
        return {
          ok: false,
          statusCode: OCPI_STATUS_CODES.NO_MATCHING_ENDPOINTS,
          message: 'No matching endpoints or expected endpoints missing between parties',
          httpStatus: 200,
        }
      }

      return {
        ok: true,
        version: selected.version as OcpiVersion,
        endpoints,
      }
    } catch {
      return {
        ok: false,
        statusCode: OCPI_STATUS_CODES.UNABLE_TO_USE_CLIENT_API,
        message: 'Unable to query client OCPI version details endpoint',
        httpStatus: 502,
      }
    }
  }
}
