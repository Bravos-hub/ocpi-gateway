import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../platform/database.module'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { KafkaModule } from '../../platform/kafka.module'
import { RedisModule } from '../../platform/redis.module'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

@Module({
  imports: [DatabaseModule, RedisModule, KafkaModule, EvzoneApiModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
