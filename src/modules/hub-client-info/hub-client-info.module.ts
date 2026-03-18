import { Module } from '@nestjs/common'
import { HubClientInfoController } from './hub-client-info.controller'
import { HubClientInfoService } from './hub-client-info.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [HubClientInfoController],
  providers: [HubClientInfoService],
})
export class HubClientInfoModule {}
