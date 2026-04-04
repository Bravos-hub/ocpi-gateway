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
  async listV221(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.tariffs.getTariffs({
      version: '2.2.1',
      role: `${res.req.params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
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
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.tariffs.upsertPartnerTariff({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
      data: body,
    })
    return ocpiSuccess(body)
  }

  @Get(':role/2.2.1/tariffs/:tariffId')
  async getV221(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    const data = await this.tariffs.getTariff({
      version: '2.2.1',
      tariffId: params.tariffId,
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(data)
  }

  @Get(':role/2.1.1/tariffs')
  async listV211(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.tariffs.getTariffs({
      version: '2.1.1',
      role: `${res.req.params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
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
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.tariffs.upsertPartnerTariff({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
    })
    return ocpiSuccess(body)
  }

  @Get(':role/2.1.1/tariffs/:tariffId')
  async getV211(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    const data = await this.tariffs.getTariff({
      version: '2.1.1',
      tariffId: params.tariffId,
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(data)
  }

  @Delete(':role/2.2.1/tariffs/:countryCode/:partyId/:tariffId')
  async deleteV221(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    await this.tariffs.deletePartnerTariff({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
    })
    return ocpiSuccess(null)
  }

  @Delete(':role/2.1.1/tariffs/:countryCode/:partyId/:tariffId')
  async deleteV211(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    await this.tariffs.deletePartnerTariff({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
      countryCode: params.countryCode,
      partyId: params.partyId,
      tariffId: params.tariffId,
    })
    return ocpiSuccess(null)
  }
}
