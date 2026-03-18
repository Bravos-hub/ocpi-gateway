import { Global, Module } from '@nestjs/common'
import { PartnersModule } from '../../partners/partners.module'
import { RedisModule } from '../../../platform/redis.module'
import { OcpiAuthGuard } from './ocpi-auth.guard'
import { OcpiIdempotencyService } from './ocpi-idempotency.service'
import { OcpiTokenCodecService } from './ocpi-token-codec.service'

@Global()
@Module({
  imports: [PartnersModule, RedisModule],
  providers: [OcpiAuthGuard, OcpiIdempotencyService, OcpiTokenCodecService],
  exports: [OcpiAuthGuard, OcpiIdempotencyService, OcpiTokenCodecService],
})
export class OcpiCoreModule {}
