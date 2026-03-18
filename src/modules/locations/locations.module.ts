import { Module } from '@nestjs/common'
import { LocationsController } from './locations.controller'
import { LocationsService } from './locations.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
