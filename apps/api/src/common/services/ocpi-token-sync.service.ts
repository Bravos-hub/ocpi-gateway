import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma.service'

type UserLike = {
  id: string
  email?: string | null
  phone?: string | null
  status?: string | null
  name?: string | null
}

type TokenInput = {
  uid: string
  type: string
  valid: boolean
  contractId?: string | null
  visualNumber?: string | null
}

@Injectable()
export class OcpiTokenSyncService {
  private readonly logger = new Logger(OcpiTokenSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async syncUserToken(user: UserLike | null | undefined) {
    if (!user?.id) return null

    const tokenUid = user.id
    const tokenType = 'APP_USER'
    const valid = this.isUserActive(user.status)

    const data = this.buildTokenData({
      uid: tokenUid,
      type: tokenType,
      valid,
      contractId: this.buildContractId(tokenUid),
      visualNumber: user.phone || user.email || null,
    })

    return this.upsertToken(tokenUid, tokenType, data, valid)
  }

  async syncIdTagToken(idTag: string | null | undefined, user?: UserLike | null) {
    const tokenUid = idTag?.trim()
    if (!tokenUid) return null

    const tokenType = 'RFID'
    const valid = true
    const contractBase = user?.id || tokenUid

    const data = this.buildTokenData({
      uid: tokenUid,
      type: tokenType,
      valid,
      contractId: this.buildContractId(contractBase),
    })

    return this.upsertToken(tokenUid, tokenType, data, valid)
  }

  private async upsertToken(
    tokenUid: string,
    tokenType: string,
    data: Record<string, unknown>,
    valid: boolean
  ) {
    const countryCode = this.getCountryCode()
    const partyId = this.getPartyId()
    const lastUpdated = new Date()

    return this.prisma.ocpiToken.upsert({
      where: {
        countryCode_partyId_tokenUid_tokenType: {
          countryCode,
          partyId,
          tokenUid,
          tokenType,
        },
      },
      update: {
        data,
        lastUpdated,
        valid,
      },
      create: {
        countryCode,
        partyId,
        tokenUid,
        tokenType,
        data,
        lastUpdated,
        valid,
      },
    })
  }

  private buildTokenData(input: TokenInput) {
    const issuer = this.getIssuer()
    const now = new Date().toISOString()

    const data: Record<string, unknown> = {
      uid: input.uid,
      type: input.type,
      issuer,
      valid: input.valid,
      whitelist: input.valid ? 'ALLOWED' : 'BLOCKED',
      last_updated: now,
    }

    if (input.contractId) {
      data.contract_id = input.contractId
    }

    if (input.visualNumber) {
      data.visual_number = input.visualNumber
    }

    return data
  }

  private isUserActive(status?: string | null) {
    if (!status) return false
    return status.toLowerCase() === 'active'
  }

  private buildContractId(baseId: string) {
    const countryCode = this.getCountryCode()
    const partyId = this.getPartyId()
    const normalized = baseId.replace(/[^a-zA-Z0-9]/g, '')
    const shortId = normalized.slice(0, 12)
    return `${countryCode}${partyId}-${shortId || normalized || baseId}`
  }

  private getCountryCode() {
    return this.config.get<string>('OCPI_COUNTRY_CODE') || 'US'
  }

  private getPartyId() {
    return this.config.get<string>('OCPI_PARTY_ID') || 'EVZ'
  }

  private getIssuer() {
    return this.config.get<string>('OCPI_BUSINESS_NAME') || 'EVzone'
  }
}
