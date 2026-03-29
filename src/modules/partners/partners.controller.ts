import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CreatePartnerDto } from './dto/create-partner.dto'
import { UpdatePartnerDto } from './dto/update-partner.dto'
import { PartnersService } from './partners.service'
import { InternalAdminGuard } from './internal-admin.guard'

@Controller('partners')
@UseGuards(InternalAdminGuard)
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto)
  }

  @Get()
  list() {
    return this.partners.findAll()
  }

  @Get('observability')
  getObservabilityOverview(@Query('limit') limit?: string) {
    return this.partners.getObservabilityOverview(this.parseLimit(limit))
  }

  @Get(':id/observability')
  getObservability(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.partners.getObservability(id, this.parseLimit(limit))
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.partners.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(id, dto)
  }

  @Delete(':id')
  suspend(@Param('id') id: string) {
    return this.partners.suspend(id)
  }

  private parseLimit(value?: string): number | undefined {
    if (!value) return undefined
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined
    return Math.floor(parsed)
  }
}
