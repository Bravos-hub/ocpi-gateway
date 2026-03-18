import { Injectable, NotFoundException } from '@nestjs/common'
import { CreatePartnerDto } from './dto/create-partner.dto'
import { UpdatePartnerDto } from './dto/update-partner.dto'
import { EvzoneApiService } from '../../platform/evzone-api.service'

@Injectable()
export class PartnersService {
  constructor(private readonly backend: EvzoneApiService) {}

  async create(dto: CreatePartnerDto) {
    return this.backend.post('/internal/ocpi/partners', {
      name: dto.name,
      partyId: dto.partyId,
      countryCode: dto.countryCode,
      role: dto.role,
      versionsUrl: dto.versionsUrl || null,
      tokenA: dto.tokenA || null,
      status: 'PENDING',
    })
  }

  async findAll() {
    return this.backend.get('/internal/ocpi/partners')
  }

  async findOne(id: string) {
    const partner = await this.backend.get(`/internal/ocpi/partners/${id}`)
    if (!partner) throw new NotFoundException('Partner not found')
    return partner
  }

  async update(id: string, dto: UpdatePartnerDto) {
    return this.backend.patch(`/internal/ocpi/partners/${id}`, dto)
  }

  async suspend(id: string) {
    return this.backend.patch(`/internal/ocpi/partners/${id}`, { status: 'SUSPENDED' })
  }

  async findByToken(token: string) {
    if (!token) return null
    const results = await this.backend.get('/internal/ocpi/partners', { token })
    if (Array.isArray(results)) {
      return results[0] || null
    }
    return results || null
  }

  async upsertFromCredentials(args: {
    tokenA?: string | null
    tokenB: string
    tokenC: string
    partyId: string
    countryCode: string
    role: string
    name: string
    versionsUrl: string
    roles?: Record<string, unknown>[] | null
    endpoints?: Record<string, unknown>[] | null
    version?: string
  }) {
    const existing = args.tokenA ? await this.findByToken(args.tokenA) : null
    if (existing) {
      return this.backend.patch(`/internal/ocpi/partners/${existing.id}`, {
        tokenB: args.tokenB,
        tokenC: args.tokenC,
        partyId: args.partyId,
        countryCode: args.countryCode,
        role: args.role,
        name: args.name,
        versionsUrl: args.versionsUrl,
        roles: args.roles || null,
        endpoints: args.endpoints || null,
        version: args.version || '2.2.1',
        status: 'ACTIVE',
        lastSyncAt: new Date().toISOString(),
      })
    }

    return this.backend.post('/internal/ocpi/partners', {
      name: args.name,
      partyId: args.partyId,
      countryCode: args.countryCode,
      role: args.role,
      status: 'ACTIVE',
      versionsUrl: args.versionsUrl,
      tokenA: args.tokenA || null,
      tokenB: args.tokenB,
      tokenC: args.tokenC,
      roles: args.roles || null,
      endpoints: args.endpoints || null,
      version: args.version || '2.2.1',
      lastSyncAt: new Date().toISOString(),
    })
  }
}
