import { HttpStatus } from '@nestjs/common'
import { OCPI_STATUS_CODES, type OcpiStatusCode } from './constants'

export type OcpiEnvelope<T = unknown> = {
  status_code: number
  status_message: string
  timestamp: string
  data?: T
}

export const ocpiNow = (): string => new Date().toISOString()

export const ocpiSuccess = <T>(
  data: T,
  statusMessage = 'OK',
  statusCode: OcpiStatusCode = OCPI_STATUS_CODES.SUCCESS
): OcpiEnvelope<T> => ({
  status_code: statusCode,
  status_message: statusMessage,
  timestamp: ocpiNow(),
  data,
})

export const ocpiError = (
  statusCode: number,
  statusMessage: string,
  data: unknown = null
): OcpiEnvelope => ({
  status_code: statusCode,
  status_message: statusMessage,
  timestamp: ocpiNow(),
  data,
})

export const httpStatusForOcpiCode = (
  ocpiCode: number,
  fallback: HttpStatus = HttpStatus.OK
): HttpStatus => {
  if (ocpiCode >= 1000 && ocpiCode < 2000) {
    return HttpStatus.OK
  }
  if (ocpiCode === OCPI_STATUS_CODES.UNKNOWN_TOKEN) {
    return HttpStatus.NOT_FOUND
  }
  if (ocpiCode >= 2000 && ocpiCode < 3000) {
    return HttpStatus.BAD_REQUEST
  }
  if (ocpiCode >= 3000 && ocpiCode < 4000) {
    return HttpStatus.INTERNAL_SERVER_ERROR
  }
  return fallback
}
