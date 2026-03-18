import { Module } from '@nestjs/common'
import { CommandsController } from './commands.controller'
import { CommandsService } from './commands.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [CommandsController],
  providers: [CommandsService],
})
export class CommandsModule {}
