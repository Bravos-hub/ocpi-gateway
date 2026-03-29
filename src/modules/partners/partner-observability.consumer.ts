import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { KAFKA_TOPICS } from '../../contracts/kafka-topics'
import { KafkaService } from '../../platform/kafka.service'
import { PartnerObservabilityService } from './partner-observability.service'

const OBSERVED_TOPICS = [
  KAFKA_TOPICS.ocpiCommandRequests,
  KAFKA_TOPICS.ocpiCommandEvents,
  KAFKA_TOPICS.ocpiChargingProfileEvents,
] as const

@Injectable()
export class PartnerObservabilityConsumer implements OnModuleInit {
  private readonly logger = new Logger(PartnerObservabilityConsumer.name)
  private enabled = true
  private subscribed = false
  private processedMessages = 0
  private failedMessages = 0
  private lastProcessedAt: string | null = null
  private lastError: string | null = null
  private groupId: string | null = null

  constructor(
    private readonly config: ConfigService,
    private readonly kafka: KafkaService,
    private readonly observability: PartnerObservabilityService
  ) {}

  async onModuleInit(): Promise<void> {
    this.enabled = this.getBoolean('observability.partnerMonitoringEnabled', true)
    if (!this.enabled) {
      this.logger.log('Partner observability consumer disabled')
      return
    }

    this.groupId =
      this.config.get<string>('observability.partnerMonitoringGroupId') ||
      'ocpi-gateway-partner-observability'

    try {
      const consumer = await this.kafka.getConsumer(this.groupId)
      for (const topic of OBSERVED_TOPICS) {
        await consumer.subscribe({ topic, fromBeginning: false })
      }
      this.subscribed = true

      void consumer.run({
        eachMessage: async ({ topic, message }) => {
          const value = message.value?.toString()
          if (!value) return
          try {
            await this.observability.ingestMessage(topic, value)
            this.processedMessages += 1
            this.lastProcessedAt = new Date().toISOString()
            this.lastError = null
          } catch (error) {
            this.failedMessages += 1
            this.lastError = error instanceof Error ? error.message : String(error)
            this.logger.warn(
              `Partner observability processing failed for topic=${topic}: ${this.lastError}`
            )
          }
        },
      }).catch((error) => {
        this.subscribed = false
        this.lastError = error instanceof Error ? error.message : String(error)
        this.logger.warn(`Partner observability consumer stopped: ${this.lastError}`)
      })
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Partner observability consumer unavailable: ${this.lastError}`)
    }
  }

  getStatus() {
    return {
      enabled: this.enabled,
      ready: !this.enabled || this.subscribed,
      groupId: this.groupId,
      topics: [...OBSERVED_TOPICS],
      processedMessages: this.processedMessages,
      failedMessages: this.failedMessages,
      lastProcessedAt: this.lastProcessedAt,
      lastError: this.lastError,
    }
  }

  private getBoolean(key: string, fallback: boolean): boolean {
    const raw = this.config.get<string>(key)
    if (!raw) return fallback
    return raw.trim().toLowerCase() === 'true'
  }
}
