import { Module } from '@nestjs/common'
import { PartnersModule } from '../partners/partners.module'
import { OcpiController } from './ocpi.controller'
import { OcpiService } from './ocpi.service'

@Module({
  imports: [PartnersModule],
  controllers: [OcpiController],
  providers: [OcpiService],
})
export class OcpiModule {}
