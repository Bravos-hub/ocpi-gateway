import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { TariffsService } from './tariffs.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { paginateOcpiList } from '../ocpi/core/ocpi-pagination'
import { ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class TariffsController {
  constructor(private readonly tariffs: TariffsService) {}

  @Get(':role/2.2.1/tariffs')
  async listV221(@Res({ passthrough: true }) res: Response, @Query() query: any) {
    const data = await this.tariffs.getTariffs('2.2.1')
    const paginated = paginateOcpiList(
      res.req,
      res,
      data,
      (item) => (item as { last_updated?: string }).last_updated
    )
    return ocpiSuccess(paginated)
  }

  @Put(':role/2.2.1/tariffs/:countryCode/:partyId/:tariffId')
  async putV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>
  ) {
    await this.tariffs.upsertPartnerTariff({
      version: '2.2.1',
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
      data: body,
    })
    return ocpiSuccess(body)
  }

  @Get(':role/2.2.1/tariffs/:tariffId')
  async getV221(@Param('tariffId') tariffId: string) {
    const data = await this.tariffs.getTariffs('2.2.1')
    const item = data.find((tariff: unknown) => (tariff as { id?: string }).id === tariffId)
    return ocpiSuccess(item || null)
  }

  @Get(':role/2.1.1/tariffs')
  async listV211(@Res({ passthrough: true }) res: Response, @Query() query: any) {
    const data = await this.tariffs.getTariffs('2.1.1')
    const paginated = paginateOcpiList(
      res.req,
      res,
      data,
      (item) => (item as { last_updated?: string }).last_updated
    )
    return ocpiSuccess(paginated)
  }

  @Put(':role/2.1.1/tariffs/:countryCode/:partyId/:tariffId')
  async putV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>
  ) {
    await this.tariffs.upsertPartnerTariff({
      version: '2.1.1',
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
    })
    return ocpiSuccess(body)
  }

  @Get(':role/2.1.1/tariffs/:tariffId')
  async getV211(@Param('tariffId') tariffId: string) {
    const data = await this.tariffs.getTariffs('2.1.1')
    const item = data.find((tariff: unknown) => (tariff as { id?: string }).id === tariffId)
    return ocpiSuccess(item || null)
  }

  @Delete(':role/2.2.1/tariffs/:countryCode/:partyId/:tariffId')
  async deleteV221(@Param() params: any) {
    await this.tariffs.deletePartnerTariff({
      version: '2.2.1',
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
    })
    return ocpiSuccess(null)
  }

  @Delete(':role/2.1.1/tariffs/:countryCode/:partyId/:tariffId')
  async deleteV211(@Param() params: any) {
    await this.tariffs.deletePartnerTariff({
      version: '2.1.1',
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
    })
    return ocpiSuccess(null)
  }
}
