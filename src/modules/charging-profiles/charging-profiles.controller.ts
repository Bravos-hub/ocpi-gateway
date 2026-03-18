import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { ChargingProfilesService } from './charging-profiles.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class ChargingProfilesController {
  constructor(private readonly chargingProfiles: ChargingProfilesService) {}

  @Get(':role/2.2.1/chargingprofiles/:sessionId')
  async getActiveProfileV221(
    @Param() params: any,
    @Query('duration') duration: string | undefined,
    @Query('response_url') responseUrl: string | undefined
  ) {
    const data = await this.chargingProfiles.getActiveProfile({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      duration,
      responseUrl,
    })
    return ocpiSuccess(data)
  }

  @Get(':role/2.1.1/chargingprofiles/:sessionId')
  async getActiveProfileV211(
    @Param() params: any,
    @Query('duration') duration: string | undefined,
    @Query('response_url') responseUrl: string | undefined
  ) {
    const data = await this.chargingProfiles.getActiveProfile({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      duration,
      responseUrl,
    })
    return ocpiSuccess(data)
  }

  @Put(':role/2.2.1/chargingprofiles/:sessionId')
  async setProfileV221(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.chargingProfiles.setChargingProfile({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      request: body,
      correlationId: res.req.ocpiContext?.correlationId || res.req.ocpiContext?.requestId || '',
      partnerId: res.req.ocpiAuth?.partner?.id,
    })
    return ocpiSuccess(result)
  }

  @Put(':role/2.1.1/chargingprofiles/:sessionId')
  async setProfileV211(
    @Param() params: any,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.chargingProfiles.setChargingProfile({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      request: body,
      correlationId: res.req.ocpiContext?.correlationId || res.req.ocpiContext?.requestId || '',
      partnerId: res.req.ocpiAuth?.partner?.id,
    })
    return ocpiSuccess(result)
  }

  @Delete(':role/2.2.1/chargingprofiles/:sessionId')
  async clearProfileV221(
    @Param() params: any,
    @Query('response_url') responseUrl: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.chargingProfiles.clearChargingProfile({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      responseUrl,
      correlationId: res.req.ocpiContext?.correlationId || res.req.ocpiContext?.requestId || '',
      partnerId: res.req.ocpiAuth?.partner?.id,
    })
    return ocpiSuccess(result)
  }

  @Delete(':role/2.1.1/chargingprofiles/:sessionId')
  async clearProfileV211(
    @Param() params: any,
    @Query('response_url') responseUrl: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.chargingProfiles.clearChargingProfile({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      responseUrl,
      correlationId: res.req.ocpiContext?.correlationId || res.req.ocpiContext?.requestId || '',
      partnerId: res.req.ocpiAuth?.partner?.id,
    })
    return ocpiSuccess(result)
  }

  @Post(':role/2.2.1/chargingprofiles/:sessionId/callback/:requestId')
  async receiveResultV221(@Param() params: any, @Body() body: Record<string, unknown>) {
    await this.chargingProfiles.receiveAsyncResult({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      requestId: params.requestId,
      result: body,
    })
    return ocpiSuccess(null)
  }

  @Post(':role/2.1.1/chargingprofiles/:sessionId/callback/:requestId')
  async receiveResultV211(@Param() params: any, @Body() body: Record<string, unknown>) {
    await this.chargingProfiles.receiveAsyncResult({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      requestId: params.requestId,
      result: body,
    })
    return ocpiSuccess(null)
  }

  @Put(':role/2.2.1/chargingprofiles/:sessionId/active')
  async updateActiveProfileV221(@Param() params: any, @Body() body: Record<string, unknown>) {
    await this.chargingProfiles.upsertActiveProfile({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      profile: body,
    })
    return ocpiSuccess(null)
  }

  @Put(':role/2.1.1/chargingprofiles/:sessionId/active')
  async updateActiveProfileV211(@Param() params: any, @Body() body: Record<string, unknown>) {
    await this.chargingProfiles.upsertActiveProfile({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      sessionId: params.sessionId,
      profile: body,
    })
    return ocpiSuccess(null)
  }
}
