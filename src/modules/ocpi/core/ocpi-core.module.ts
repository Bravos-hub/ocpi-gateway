import { Global, Module } from '@nestjs/common'
import { PartnersModule } from '../../partners/partners.module'
import { KafkaModule } from '../../../platform/kafka.module'
import { RedisModule } from '../../../platform/redis.module'
import { OcpiAuthGuard } from './ocpi-auth.guard'
import { OcpiEventPublisherService } from './ocpi-event-publisher.service'
import { OcpiIdempotencyService } from './ocpi-idempotency.service'
import { OcpiTokenCodecService } from './ocpi-token-codec.service'

@Global()
@Module({
  imports: [PartnersModule, RedisModule, KafkaModule],
  providers: [
    OcpiAuthGuard,
    OcpiEventPublisherService,
    OcpiIdempotencyService,
    OcpiTokenCodecService,
  ],
  exports: [
    OcpiAuthGuard,
    OcpiEventPublisherService,
    OcpiIdempotencyService,
    OcpiTokenCodecService,
  ],
})
export class OcpiCoreModule {}
