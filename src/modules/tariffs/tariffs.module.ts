import { Module } from '@nestjs/common'
import { TariffsController } from './tariffs.controller'
import { TariffsService } from './tariffs.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [TariffsController],
  providers: [TariffsService],
})
export class TariffsModule {}
