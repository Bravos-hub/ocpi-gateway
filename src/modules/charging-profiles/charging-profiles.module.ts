import { Module } from '@nestjs/common'
import { ChargingProfilesController } from './charging-profiles.controller'
import { ChargingProfilesService } from './charging-profiles.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [ChargingProfilesController],
  providers: [ChargingProfilesService],
})
export class ChargingProfilesModule {}
