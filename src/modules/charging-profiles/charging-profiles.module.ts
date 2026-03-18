import { Module } from '@nestjs/common'
import { ChargingProfilesController } from './charging-profiles.controller'
import { ChargingProfilesService } from './charging-profiles.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [ChargingProfilesController],
  providers: [ChargingProfilesService],
})
export class ChargingProfilesModule {}
