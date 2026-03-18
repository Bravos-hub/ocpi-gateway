import { Module } from '@nestjs/common'
import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
