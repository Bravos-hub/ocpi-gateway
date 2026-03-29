import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { TokensService } from './tokens.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { paginateOcpiList } from '../ocpi/core/ocpi-pagination'
import { httpStatusForOcpiCode, ocpiError, ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  @Get(':role/2.2.1/tokens')
  async listV221(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.tokens.getTokens({
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

  @Get(':role/2.1.1/tokens')
  async listV211(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.tokens.getTokens({
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

  @Get(':role/2.2.1/tokens/:countryCode/:partyId/:tokenUid')
  async getReceiverV221(
    @Param() params: any,
    @Query('type') type: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const token = await this.tokens.getPartnerToken({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      tokenUid: params.tokenUid,
      tokenType: type || 'RFID',
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    if (!token?.data) {
      const payload = ocpiError(2004, 'Unknown Token')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.NOT_FOUND))
      return payload
    }
    return ocpiSuccess(token.data)
  }

  @Get(':role/2.1.1/tokens/:countryCode/:partyId/:tokenUid')
  async getReceiverV211(
    @Param() params: any,
    @Query('type') type: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const token = await this.tokens.getPartnerToken({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      tokenUid: params.tokenUid,
      tokenType: type || 'RFID',
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    if (!token?.data) {
      const payload = ocpiError(2004, 'Unknown Token')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.NOT_FOUND))
      return payload
    }
    return ocpiSuccess(token.data)
  }

  @Put(':role/2.2.1/tokens/:countryCode/:partyId/:tokenUid')
  async putReceiverV221(
    @Param() params: any,
    @Query('type') type: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.tokens.upsertPartnerToken({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      tokenUid: params.tokenUid,
      tokenType: type || 'RFID',
      data: body,
      isPatch: false,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Patch(':role/2.2.1/tokens/:countryCode/:partyId/:tokenUid')
  async patchReceiverV221(
    @Param() params: any,
    @Query('type') type: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.tokens.upsertPartnerToken({
      version: '2.2.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      tokenUid: params.tokenUid,
      tokenType: type || 'RFID',
      data: body,
      isPatch: true,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Put(':role/2.1.1/tokens/:countryCode/:partyId/:tokenUid')
  async putReceiverV211(
    @Param() params: any,
    @Query('type') type: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.tokens.upsertPartnerToken({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      tokenUid: params.tokenUid,
      tokenType: type || 'RFID',
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
      isPatch: false,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Patch(':role/2.1.1/tokens/:countryCode/:partyId/:tokenUid')
  async patchReceiverV211(
    @Param() params: any,
    @Query('type') type: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.tokens.upsertPartnerToken({
      version: '2.1.1',
      role: `${params.role || ''}`.toLowerCase(),
      countryCode: params.countryCode,
      partyId: params.partyId,
      tokenUid: params.tokenUid,
      tokenType: type || 'RFID',
      data: { ...body, country_code: params.countryCode, party_id: params.partyId },
      isPatch: true,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    return ocpiSuccess(body)
  }

  @Post(':role/2.2.1/tokens/:tokenUid/authorize')
  async authorizeV221(
    @Param('tokenUid') tokenUid: string,
    @Query('type') type: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    const hasLocationRef = typeof body?.location_id === 'string' || typeof body?.evse_uid === 'string'
    if (!hasLocationRef) {
      const payload = ocpiError(2002, 'Not enough information')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.BAD_REQUEST))
      return payload
    }

    const result = await this.tokens.authorizeToken({
      version: '2.2.1',
      role: `${res.req.params.role || ''}`.toLowerCase(),
      tokenUid,
      tokenType: type || 'RFID',
      location: body,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    if (!result) {
      const payload = ocpiError(2004, 'Unknown Token')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.NOT_FOUND))
      return payload
    }
    return ocpiSuccess(result)
  }

  @Post(':role/2.1.1/tokens/:tokenUid/authorize')
  async authorizeV211(
    @Param('tokenUid') tokenUid: string,
    @Query('type') type: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response
  ) {
    const hasLocationRef = typeof body?.location_id === 'string' || typeof body?.evse_uid === 'string'
    if (!hasLocationRef) {
      const payload = ocpiError(2002, 'Not enough information')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.BAD_REQUEST))
      return payload
    }

    const result = await this.tokens.authorizeToken({
      version: '2.1.1',
      role: `${res.req.params.role || ''}`.toLowerCase(),
      tokenUid,
      tokenType: type || 'RFID',
      location: body,
      partnerId: res.req.ocpiAuth?.partner?.id,
      requestId: res.req.ocpiContext?.requestId,
      correlationId: res.req.ocpiContext?.correlationId,
    })
    if (!result) {
      const payload = ocpiError(2004, 'Unknown Token')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.NOT_FOUND))
      return payload
    }
    return ocpiSuccess(result)
  }
}
