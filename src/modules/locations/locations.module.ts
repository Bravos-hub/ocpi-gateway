import { Module } from '@nestjs/common'
import { LocationsController } from './locations.controller'
import { LocationsService } from './locations.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
