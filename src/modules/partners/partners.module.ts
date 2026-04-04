import { Module } from '@nestjs/common'
import { PartnersController } from './partners.controller'
import { PartnerObservabilityConsumer } from './partner-observability.consumer'
import { PartnerObservabilityService } from './partner-observability.service'
import { PartnersService } from './partners.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { InternalAdminGuard } from './internal-admin.guard'
import { KafkaModule } from '../../platform/kafka.module'
import { RedisModule } from '../../platform/redis.module'

@Module({
  imports: [EvzoneApiModule, KafkaModule, RedisModule],
  controllers: [PartnersController],
  providers: [
    PartnersService,
    PartnerObservabilityConsumer,
    PartnerObservabilityService,
    InternalAdminGuard,
  ],
  exports: [PartnersService],
})
export class PartnersModule {}
