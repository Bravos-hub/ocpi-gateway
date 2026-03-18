import { Module } from '@nestjs/common'
import { CommandsController } from './commands.controller'
import { CommandsService } from './commands.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'
import { OcpiCoreModule } from '../ocpi/core/ocpi-core.module'
import { PartnersModule } from '../partners/partners.module'

@Module({
  imports: [EvzoneApiModule, OcpiCoreModule, PartnersModule],
  controllers: [CommandsController],
  providers: [CommandsService],
})
export class CommandsModule {}
