import { Module } from '@nestjs/common'
import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
