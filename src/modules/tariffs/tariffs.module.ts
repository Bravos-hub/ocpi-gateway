import { Module } from '@nestjs/common'
import { TariffsController } from './tariffs.controller'
import { TariffsService } from './tariffs.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [TariffsController],
  providers: [TariffsService],
})
export class TariffsModule {}
