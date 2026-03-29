import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('redis.url') || 'redis://localhost:6379'
    const keyPrefix = this.config.get<string>('redis.prefix') || 'ocpi'
    this.client = new Redis(url, { keyPrefix: `${keyPrefix}:` })
  }

  getClient(): Redis {
    return this.client
  }

  async checkConnection(): Promise<{ status: 'up' | 'down'; error?: string }> {
    try {
      const response = await this.client.ping()
      return { status: response === 'PONG' ? 'up' : 'down' }
    } catch (error) {
      return { status: 'down', error: (error as Error).message }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }
}
