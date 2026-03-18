import { Module } from '@nestjs/common'
import { EvzoneApiService } from './evzone-api.service'

@Module({
  providers: [EvzoneApiService],
  exports: [EvzoneApiService],
})
export class EvzoneApiModule {}
