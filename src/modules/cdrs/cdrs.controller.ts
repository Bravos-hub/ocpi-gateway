import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { CdrsService } from './cdrs.service'
import { OcpiAuthGuard } from '../ocpi/core/ocpi-auth.guard'
import { paginateOcpiList } from '../ocpi/core/ocpi-pagination'
import { httpStatusForOcpiCode, ocpiError, ocpiSuccess } from '../ocpi/core/ocpi-response'

@Controller('ocpi')
@UseGuards(OcpiAuthGuard)
export class CdrsController {
  constructor(private readonly cdrs: CdrsService) {}

  @Post(':role/2.2.1/cdrs')
  async createV221(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const created = await this.cdrs.createCdr({ version: '2.2.1', data: body })
    const id =
      (body as { id?: string; cdr_id?: string }).id ||
      (body as { id?: string; cdr_id?: string }).cdr_id
    if (id) {
      res.setHeader('Location', `${res.req.baseUrl}${res.req.path}/${id}`)
    }
    return ocpiSuccess(created && typeof created === 'object' ? created : body)
  }

  @Post(':role/2.1.1/cdrs')
  async createV211(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) res: Response) {
    const created = await this.cdrs.createCdr({ version: '2.1.1', data: body })
    const id =
      (body as { id?: string; cdr_id?: string }).id ||
      (body as { id?: string; cdr_id?: string }).cdr_id
    if (id) {
      res.setHeader('Location', `${res.req.baseUrl}${res.req.path}/${id}`)
    }
    return ocpiSuccess(created && typeof created === 'object' ? created : body)
  }

  @Get(':role/2.2.1/cdrs')
  async listV221(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.cdrs.listCdrs()
    const paginated = paginateOcpiList(
      res.req,
      res,
      data,
      (item) => (item as { last_updated?: string }).last_updated
    )
    return ocpiSuccess(paginated)
  }

  @Get(':role/2.1.1/cdrs')
  async listV211(@Res({ passthrough: true }) res: Response, @Query() _query: any) {
    const data = await this.cdrs.listCdrs()
    const paginated = paginateOcpiList(
      res.req,
      res,
      data,
      (item) => (item as { last_updated?: string }).last_updated
    )
    return ocpiSuccess(paginated)
  }

  @Get(':role/2.2.1/cdrs/:cdrId')
  async getV221(@Param('cdrId') cdrId: string, @Res({ passthrough: true }) res: Response) {
    const data = await this.cdrs.getCdr(cdrId)
    if (!data) {
      const payload = ocpiError(2001, 'Invalid or missing parameters')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.NOT_FOUND))
      return payload
    }
    return ocpiSuccess(data)
  }

  @Get(':role/2.1.1/cdrs/:cdrId')
  async getV211(@Param('cdrId') cdrId: string, @Res({ passthrough: true }) res: Response) {
    const data = await this.cdrs.getCdr(cdrId)
    if (!data) {
      const payload = ocpiError(2001, 'Invalid or missing parameters')
      res.status(httpStatusForOcpiCode(payload.status_code, HttpStatus.NOT_FOUND))
      return payload
    }
    return ocpiSuccess(data)
  }
}
