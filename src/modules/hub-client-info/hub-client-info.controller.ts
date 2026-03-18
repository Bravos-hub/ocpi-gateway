import { Body, Controller, Get, Param, Put, Query, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { HubClientInfoService } from './hub-client-info.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { paginateOcpiList } from '../ocpi/core/ocpi-pagination'
import { ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class HubClientInfoController {
  constructor(private readonly hubClientInfo: HubClientInfoService) {}

  @Get(':role/2.2.1/hubclientinfo')
  async listV221(@Param('role') role: string, @Res({ passthrough: true }) res: Response, @Query() query: any) {
    const data = await this.hubClientInfo.listClientInfo({ version: '2.2.1', role })
    const paginated = paginateOcpiList(
      res.req,
      res,
      data,
      (item) => (item as { last_updated?: string }).last_updated
    )
    return ocpiSuccess(paginated)
  }

  @Get(':role/2.1.1/hubclientinfo')
  async listV211(@Param('role') role: string, @Res({ passthrough: true }) res: Response, @Query() query: any) {
    const data = await this.hubClientInfo.listClientInfo({ version: '2.1.1', role })
    const paginated = paginateOcpiList(
      res.req,
      res,
      data,
      (item) => (item as { last_updated?: string }).last_updated
    )
    return ocpiSuccess(paginated)
  }

  @Get(':role/2.2.1/hubclientinfo/:countryCode/:partyId')
  async getV221(@Param() params: any) {
    const data = await this.hubClientInfo.getClientInfo({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
    })
    return ocpiSuccess(data || null)
  }

  @Get(':role/2.1.1/hubclientinfo/:countryCode/:partyId')
  async getV211(@Param() params: any) {
    const data = await this.hubClientInfo.getClientInfo({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
    })
    return ocpiSuccess(data || null)
  }

  @Put(':role/2.2.1/hubclientinfo/:countryCode/:partyId')
  async putV221(@Param() params: any, @Body() body: Record<string, unknown>) {
    await this.hubClientInfo.upsertClientInfo({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      data: body,
    })
    return ocpiSuccess(body)
  }

  @Put(':role/2.1.1/hubclientinfo/:countryCode/:partyId')
  async putV211(@Param() params: any, @Body() body: Record<string, unknown>) {
    await this.hubClientInfo.upsertClientInfo({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      data: body,
    })
    return ocpiSuccess(body)
  }
}
