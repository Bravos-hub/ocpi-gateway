import { Module } from '@nestjs/common'
import { HubClientInfoController } from './hub-client-info.controller'
import { HubClientInfoService } from './hub-client-info.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [HubClientInfoController],
  providers: [HubClientInfoService],
})
export class HubClientInfoModule {}
