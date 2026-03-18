import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { CreatePartnerDto } from './dto/create-partner.dto'
import { UpdatePartnerDto } from './dto/update-partner.dto'
import { PartnersService } from './partners.service'

@Controller('partners')
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
}
