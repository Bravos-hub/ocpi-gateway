import { Module } from '@nestjs/common'
import { PartnersController } from './partners.controller'
import { PartnersService } from './partners.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
