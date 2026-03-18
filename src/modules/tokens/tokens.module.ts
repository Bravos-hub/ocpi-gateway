import { Module } from '@nestjs/common'
import { TokensController } from './tokens.controller'
import { TokensService } from './tokens.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [TokensController],
  providers: [TokensService],
})
export class TokensModule {}
