import { Injectable, NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { isOcpiFunctionalModule } from './constants'
import { ocpiError } from './ocpi-response'

const readHeader = (req: Request, headerName: string): string | undefined => {
  const value = req.headers[headerName.toLowerCase()]
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim()
  return undefined
}

const extractModuleId = (req: Request): string | null => {
  const path = req.path || ''
  const match = path.match(/^\/ocpi\/[^/]+\/2\.\d+\.\d+\/([^/?]+)/i)
  return match?.[1]?.toLowerCase() || null
}

@Injectable()
export class OcpiContextMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = readHeader(req, 'x-request-id') || randomUUID()
    const correlationId = readHeader(req, 'x-correlation-id') || requestId

    req.ocpiContext = {
      requestId,
      correlationId,
      routing: {
        toPartyId: readHeader(req, 'ocpi-to-party-id'),
        toCountryCode: readHeader(req, 'ocpi-to-country-code'),
        fromPartyId: readHeader(req, 'ocpi-from-party-id'),
        fromCountryCode: readHeader(req, 'ocpi-from-country-code'),
      },
    }

    res.setHeader('X-Request-ID', requestId)
    res.setHeader('X-Correlation-ID', correlationId)

    const ownPartyId = this.config.get<string>('ocpi.partyId') || 'EVZ'
    const ownCountryCode = this.config.get<string>('ocpi.countryCode') || 'US'
    res.setHeader('OCPI-from-party-id', ownPartyId)
    res.setHeader('OCPI-from-country-code', ownCountryCode)

    if (req.ocpiContext.routing.fromPartyId) {
      res.setHeader('OCPI-to-party-id', req.ocpiContext.routing.fromPartyId)
    }
    if (req.ocpiContext.routing.fromCountryCode) {
      res.setHeader('OCPI-to-country-code', req.ocpiContext.routing.fromCountryCode)
    }

    const strictRouting = this.config.get<boolean>('ocpi.requireRoutingHeaders') ?? false
    if (strictRouting) {
      const moduleId = extractModuleId(req)
      if (moduleId && isOcpiFunctionalModule(moduleId)) {
        const hasFromHeaders =
          !!req.ocpiContext.routing.fromPartyId && !!req.ocpiContext.routing.fromCountryCode
        if (!hasFromHeaders) {
          res.status(400).json(ocpiError(2001, 'Missing OCPI routing headers'))
          return
        }
      }
    }

    next()
  }
}
