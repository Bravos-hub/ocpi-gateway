import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { OCPI_STATUS_CODES } from './constants'
import { ocpiError } from './ocpi-response'

const toOcpiCode = (httpStatus: number): number => {
  if (httpStatus === HttpStatus.NOT_FOUND) return OCPI_STATUS_CODES.UNKNOWN_TOKEN
  if (httpStatus === HttpStatus.UNAUTHORIZED) return OCPI_STATUS_CODES.UNKNOWN_TOKEN
  if (httpStatus === HttpStatus.FORBIDDEN) return OCPI_STATUS_CODES.INVALID_OR_MISSING_PARAMETERS
  if (httpStatus >= 400 && httpStatus < 500) return OCPI_STATUS_CODES.CLIENT_ERROR
  if (httpStatus >= 500) return OCPI_STATUS_CODES.SERVER_ERROR
  return OCPI_STATUS_CODES.SERVER_ERROR
}

@Catch(HttpException)
export class OcpiExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    if (!req.path.startsWith('/ocpi')) {
      const status = exception.getStatus()
      res.status(status).json(exception.getResponse())
      return
    }

    const status = exception.getStatus()
    const response = exception.getResponse()
    const message =
      typeof response === 'string'
        ? response
        : ((response as { message?: string | string[] })?.message ?? exception.message)

    const normalizedMessage = Array.isArray(message) ? message.join(', ') : message
    const ocpiCode = toOcpiCode(status)

    res.status(status).json(ocpiError(ocpiCode, normalizedMessage || 'Request failed'))
  }
}
