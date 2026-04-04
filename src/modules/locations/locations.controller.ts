import { Body, Controller, Get, Param, Patch, Put, Query, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { LocationsService } from './locations.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { paginateOcpiList } from '../ocpi/core/ocpi-pagination'
import { ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get(':role/2.2.1/locations')
  async listV221(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.locations.getLocationsForVersion({
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

  @Get(':role/2.1.1/locations')
  async listV211(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.locations.getLocationsForVersion({
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

  @Get(':role/2.2.1/locations/:locationId')
  async getV221(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    const data = await this.locations.getLocationForVersion({
      id: params.locationId,
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(data)
  }

  @Put(':role/2.2.1/locations/:countryCode/:partyId/:locationId')
  @Put(':role/2.2.1/locations/:countryCode/:partyId/:locationId/:evseUid')
  @Put(':role/2.2.1/locations/:countryCode/:partyId/:locationId/:evseUid/:connectorId')
  async putV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.locations.upsertPartnerLocation({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      locationId: params.locationId,
      evseUid: params.evseUid,
      connectorId: params.connectorId,
      data: body,
      isPatch: false,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Patch(':role/2.2.1/locations/:countryCode/:partyId/:locationId')
  @Patch(':role/2.2.1/locations/:countryCode/:partyId/:locationId/:evseUid')
  @Patch(':role/2.2.1/locations/:countryCode/:partyId/:locationId/:evseUid/:connectorId')
  async patchV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.locations.upsertPartnerLocation({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      locationId: params.locationId,
      evseUid: params.evseUid,
      connectorId: params.connectorId,
      data: body,
      isPatch: true,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Get(':role/2.1.1/locations/:locationId')
  async getV211(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    const data = await this.locations.getLocationForVersion({
      id: params.locationId,
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(data)
  }

  @Put(':role/2.1.1/locations/:countryCode/:partyId/:locationId')
  @Put(':role/2.1.1/locations/:countryCode/:partyId/:locationId/:evseUid')
  @Put(':role/2.1.1/locations/:countryCode/:partyId/:locationId/:evseUid/:connectorId')
  async putV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.locations.upsertPartnerLocation({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      locationId: params.locationId,
      evseUid: params.evseUid,
      connectorId: params.connectorId,
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
      isPatch: false,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Patch(':role/2.1.1/locations/:countryCode/:partyId/:locationId')
  @Patch(':role/2.1.1/locations/:countryCode/:partyId/:locationId/:evseUid')
  @Patch(':role/2.1.1/locations/:countryCode/:partyId/:locationId/:evseUid/:connectorId')
  async patchV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.locations.upsertPartnerLocation({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      locationId: params.locationId,
      evseUid: params.evseUid,
      connectorId: params.connectorId,
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
      isPatch: true,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }
}
