import { Module } from '@nestjs/common'
import { CdrsController } from './cdrs.controller'
import { CdrsService } from './cdrs.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [CdrsController],
  providers: [CdrsService],
})
export class CdrsModule {}
