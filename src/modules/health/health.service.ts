import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { EvzoneApiService } from '../../platform/evzone-api.service'
import { KafkaService } from '../../platform/kafka.service'
import { RedisService } from '../../platform/redis.service'

type DependencyState = 'up' | 'down' | 'unconfigured'

type DependencyReport = {
  status: DependencyState
  required: boolean
  error?: string
}

type DependencyMap = {
  database: DependencyReport
  redis: DependencyReport
  backendApi: DependencyReport
  kafka: DependencyReport
}

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly kafka: KafkaService,
    private readonly backend: EvzoneApiService
  ) {}

  async getHealth() {
    const [database, redis, backendApi, kafka] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkBackendApi(),
      this.checkKafka(),
    ])

    const dependencies: DependencyMap = {
      database,
      redis,
      backendApi,
      kafka,
    }

    const ready = this.isReady(dependencies)
    const status = this.computeStatus(dependencies)

    return {
      status,
      ready,
      service: this.config.get<string>('service.name'),
      time: new Date().toISOString(),
      dependencies,
    }
  }

  private isReady(dependencies: DependencyMap): boolean {
    return Object.values(dependencies)
      .filter((dependency) => dependency.required)
      .every((dependency) => dependency.status === 'up')
  }

  private computeStatus(dependencies: DependencyMap): 'ok' | 'degraded' {
    const hasFailures = Object.values(dependencies).some((dependency) => dependency.status === 'down')
    const hasRequiredGaps = Object.values(dependencies).some(
      (dependency) => dependency.required && dependency.status === 'unconfigured'
    )
    return hasFailures || hasRequiredGaps ? 'degraded' : 'ok'
  }

  private async checkDatabase(): Promise<DependencyReport> {
    try {
      await this.dataSource.query('SELECT 1')
      return { status: 'up', required: true }
    } catch (error) {
      return {
        status: 'down',
        required: true,
        error: this.toErrorMessage(error),
      }
    }
  }

  private async checkRedis(): Promise<DependencyReport> {
    const result = await this.redis.checkConnection()
    return {
      status: result.status,
      required: true,
      error: result.error,
    }
  }

  private async checkBackendApi(): Promise<DependencyReport> {
    const result = await this.backend.checkConnection()
    return {
      status: result.status,
      required: true,
      error: result.error,
    }
  }

  private async checkKafka(): Promise<DependencyReport> {
    const result = await this.kafka.checkConnection()
    return {
      status: result.status,
      required: false,
      error: result.error,
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error'
  }
}
