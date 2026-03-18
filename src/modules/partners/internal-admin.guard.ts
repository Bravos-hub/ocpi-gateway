import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'
import { timingSafeEqual } from 'crypto'

@Injectable()
export class InternalAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const method = String(request.method || 'GET').toUpperCase()

    if (this.validateStaticAdminToken(request)) {
      return true
    }

    const authHeader = String(request.headers.authorization || '')
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing internal admin credentials')
    }

    const serviceJwtSecret = this.config.get<string>('admin.serviceJwtSecret') || ''
    if (!serviceJwtSecret) {
      throw new UnauthorizedException('Service JWT verification is not configured')
    }

    const token = authHeader.slice(7)
    const options: jwt.VerifyOptions = {}
    const issuer = this.config.get<string>('admin.serviceJwtIssuer')
    const audience = this.config.get<string>('admin.serviceJwtAudience')
    if (issuer) options.issuer = issuer
    if (audience) options.audience = audience

    let payload: any
    try {
      payload = jwt.verify(token, serviceJwtSecret, options) as any
    } catch {
      throw new UnauthorizedException('Invalid service token')
    }

    const tokenType = String(payload?.type || '').toLowerCase()
    if (tokenType !== 'service') {
      throw new UnauthorizedException('Invalid token type for admin route')
    }

    const scopes = this.normalizeScopes(payload?.scopes || payload?.scope)
    const required =
      method === 'GET'
        ? ['ocpi:read', 'ocpi:write', 'ocpi:admin']
        : ['ocpi:write', 'ocpi:admin']
    if (!required.some((scope) => scopes.includes(scope))) {
      throw new UnauthorizedException('Insufficient scopes for admin route')
    }

    request.internalAdmin = payload
    return true
  }

  private validateStaticAdminToken(request: any): boolean {
    const configured =
      this.config.get<string>('admin.token') ||
      process.env.OCPI_ADMIN_TOKEN ||
      process.env.INTERNAL_ADMIN_TOKEN ||
      ''
    if (!configured) {
      return false
    }

    const provided =
      String(request.headers['x-internal-admin-token'] || '') ||
      String(request.headers['x-admin-token'] || '')
    if (!provided) {
      return false
    }

    const left = Buffer.from(configured)
    const right = Buffer.from(provided)
    if (left.length !== right.length) {
      return false
    }
    return timingSafeEqual(left, right)
  }

  private normalizeScopes(input: unknown): string[] {
    if (Array.isArray(input)) {
      return input.map((value) => String(value).trim()).filter(Boolean)
    }
    if (typeof input === 'string') {
      return input
        .split(' ')
        .map((value) => value.trim())
        .filter(Boolean)
    }
    return []
  }
}
