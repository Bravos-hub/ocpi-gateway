import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/
const PRINTABLE_ASCII_PATTERN = /^[\x21-\x7E]+$/

@Injectable()
export class OcpiTokenCodecService {
  constructor(private readonly config: ConfigService) {}

  parseAuthorizationTokenCandidates(headerValue: string | undefined): string[] {
    if (!headerValue || !headerValue.trim()) return []

    const trimmed = headerValue.trim()
    const parts = trimmed.split(' ')
    const rawToken =
      parts.length >= 2 ? parts.slice(1).join(' ').trim() : trimmed

    if (!rawToken) return []

    const candidates = new Set<string>()
    const acceptPlain = this.config.get<boolean>('ocpi.acceptPlainCredentialsToken') ?? true

    if (acceptPlain) {
      candidates.add(rawToken)
    }

    const decoded = this.tryDecodeBase64(rawToken)
    if (decoded) {
      candidates.add(decoded)
    }

    // If plain is disabled but base64 decoding did not work, keep the raw token as fallback.
    if (!acceptPlain && candidates.size === 0) {
      candidates.add(rawToken)
    }

    return Array.from(candidates)
  }

  formatAuthorizationHeader(token: string): string {
    const encoding = (this.config.get<string>('ocpi.credentialsTokenEncoding') || 'BASE64')
      .trim()
      .toUpperCase()

    if (encoding === 'PLAIN') {
      return `Token ${token}`
    }

    const encoded = Buffer.from(token, 'utf8').toString('base64')
    return `Token ${encoded}`
  }

  private tryDecodeBase64(value: string): string | null {
    const compact = value.replace(/\s+/g, '')
    if (!compact || compact.length % 4 !== 0) return null
    if (!BASE64_PATTERN.test(compact)) return null

    try {
      const decoded = Buffer.from(compact, 'base64').toString('utf8').trim()
      if (!decoded || !PRINTABLE_ASCII_PATTERN.test(decoded)) return null
      return decoded
    } catch {
      return null
    }
  }
}
