import { Module } from '@nestjs/common'
import { TokensController } from './tokens.controller'
import { TokensService } from './tokens.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [TokensController],
  providers: [TokensService],
})
export class TokensModule {}
