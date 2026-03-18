import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { Request } from 'express'
import { PartnersService } from '../../partners/partners.service'
import { OCPI_ALLOWED_ROLES, isOcpiFunctionalModule } from './constants'
import { OcpiPartnerInfo } from './ocpi-route-context'
import { OcpiTokenCodecService } from './ocpi-token-codec.service'

const extractRoleAndModule = (
  req: Request
): { role: string; moduleId: string } | null => {
  const path = req.path || ''
  const match = path.match(/^\/ocpi\/([^/]+)\/2\.\d+\.\d+\/([^/?]+)/i)
  if (!match) return null

  return {
    role: match[1].toLowerCase(),
    moduleId: match[2].toLowerCase(),
  }
}

const roleMatchesPartner = (requestedRole: string, partner: OcpiPartnerInfo): boolean => {
  const roles = Array.isArray(partner.roles) ? partner.roles : []
  if (roles.length > 0) {
    return roles.some((entry) => {
      const role = entry?.role
      return typeof role === 'string' && role.toLowerCase() === requestedRole
    })
  }

  if (typeof partner.role !== 'string' || !partner.role.trim()) return true
  return partner.role.toLowerCase() === requestedRole
}

@Injectable()
export class OcpiAuthGuard implements CanActivate {
  constructor(
    private readonly partners: PartnersService,
    private readonly tokenCodec: OcpiTokenCodecService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true

    const req = context.switchToHttp().getRequest<Request>()
    const parsed = extractRoleAndModule(req)
    if (!parsed) return true

    if (!isOcpiFunctionalModule(parsed.moduleId)) {
      return true
    }

    if (!OCPI_ALLOWED_ROLES.has(parsed.role)) {
      throw new ForbiddenException('Unsupported OCPI role')
    }

    const rawAuthHeader = req.header('authorization')
    const tokenCandidates = this.tokenCodec.parseAuthorizationTokenCandidates(rawAuthHeader)
    if (tokenCandidates.length === 0) {
      throw new UnauthorizedException('Missing OCPI credentials token')
    }

    let matchedPartner: OcpiPartnerInfo | null = null
    let matchedToken: string | null = null

    for (const candidate of tokenCandidates) {
      const partner = (await this.partners.findByToken(candidate)) as OcpiPartnerInfo | null
      if (partner?.id) {
        matchedPartner = partner
        matchedToken = candidate
        break
      }
    }

    if (!matchedPartner || !matchedToken) {
      throw new UnauthorizedException('Unknown OCPI credentials token')
    }

    if ((matchedPartner.status || '').toUpperCase() !== 'ACTIVE') {
      throw new UnauthorizedException('Inactive OCPI partner')
    }

    if (!roleMatchesPartner(parsed.role, matchedPartner)) {
      throw new ForbiddenException('Partner role mismatch')
    }

    req.ocpiAuth = {
      token: matchedToken,
      partner: matchedPartner,
    }

    return true
  }
}
