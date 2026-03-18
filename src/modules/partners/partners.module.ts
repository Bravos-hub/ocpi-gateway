import { Module } from '@nestjs/common'
import { PartnersController } from './partners.controller'
import { PartnersService } from './partners.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { InternalAdminGuard } from './internal-admin.guard'

@Module({
  imports: [EvzoneApiModule],
  controllers: [PartnersController],
  providers: [PartnersService, InternalAdminGuard],
  exports: [PartnersService],
})
export class PartnersModule {}
