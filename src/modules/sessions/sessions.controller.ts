import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { SessionsService } from './sessions.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { paginateOcpiList } from '../ocpi/core/ocpi-pagination'
import { ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get(':role/2.2.1/sessions')
  async listV221(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.sessions.getSessions({
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

  @Get(':role/2.2.1/sessions/:sessionId')
  async getV221(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    const data = await this.sessions.getSession({
      id: params.sessionId,
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(data)
  }

  @Put(':role/2.2.1/sessions/:countryCode/:partyId/:sessionId')
  async putV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.sessions.upsertPartnerSession({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      sessionId: params.sessionId,
      data: body,
      isPatch: false,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Patch(':role/2.2.1/sessions/:countryCode/:partyId/:sessionId')
  async patchV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.sessions.upsertPartnerSession({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      sessionId: params.sessionId,
      data: body,
      isPatch: true,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Put(':role/2.2.1/sessions/:sessionId/charging_preferences')
  async putChargingPreferencesV221(
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.sessions.setChargingPreferences({
      version: '2.2.1',
      role: `${res.req.params.role || ''}`.toLowerCase(),
      sessionId,
      data: body,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Get(':role/2.1.1/sessions')
  async listV211(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.sessions.getSessions({
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

  @Get(':role/2.1.1/sessions/:sessionId')
  async getV211(@Param() params: any, @Res({ passthrough: true }) res: Response) {
    const data = await this.sessions.getSession({
      id: params.sessionId,
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(data)
  }

  @Put(':role/2.1.1/sessions/:countryCode/:partyId/:sessionId')
  async putV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.sessions.upsertPartnerSession({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      sessionId: params.sessionId,
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
      isPatch: false,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Patch(':role/2.1.1/sessions/:countryCode/:partyId/:sessionId')
  async patchV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.sessions.upsertPartnerSession({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      sessionId: params.sessionId,
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
      isPatch: true,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Put(':role/2.1.1/sessions/:sessionId/charging_preferences')
  async putChargingPreferencesV211(
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.sessions.setChargingPreferences({
      version: '2.1.1',
      role: `${res.req.params.role || ''}`.toLowerCase(),
      sessionId,
      data: body,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }
}
