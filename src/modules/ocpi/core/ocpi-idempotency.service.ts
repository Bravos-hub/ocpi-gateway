import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'crypto'
import { RedisService } from '../../../platform/redis.service'

@Injectable()
export class OcpiIdempotencyService {
  private readonly logger = new Logger(OcpiIdempotencyService.name)

  constructor(private readonly redis: RedisService) {}

  async isDuplicate(
    scope: string,
    parts: Array<string | number | null | undefined>,
    ttlSeconds = 24 * 60 * 60
  ): Promise<boolean> {
    const keyMaterial = parts.map((part) => `${part ?? ''}`).join('|')
    const digest = createHash('sha256').update(`${scope}:${keyMaterial}`).digest('hex')
    const key = `idempotency:${scope}:${digest}`

    try {
      const result = await this.redis.getClient().set(key, '1', 'EX', ttlSeconds, 'NX')
      return result !== 'OK'
    } catch (error) {
      this.logger.warn(`Redis idempotency check failed for scope=${scope}: ${String(error)}`)
      return false
    }
  }
}
