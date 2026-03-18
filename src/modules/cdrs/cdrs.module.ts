import { Module } from '@nestjs/common'
import { CdrsController } from './cdrs.controller'
import { CdrsService } from './cdrs.service'
import { EvzoneApiModule } from '../../platform/evzone-api.module'

@Module({
  imports: [EvzoneApiModule],
  controllers: [CdrsController],
  providers: [CdrsService],
})
export class CdrsModule {}
