import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import { Response } from 'express'
import { HealthService } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async getHealth(@Res({ passthrough: true }) response: Response) {
    const report = await this.health.getHealth()
    response.status(report.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
    return report
  }
}
