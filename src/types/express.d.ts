import { OcpiAuthContext, OcpiRequestContext } from '../modules/ocpi/core/ocpi-route-context'

declare module 'express-serve-static-core' {
  interface Request {
    ocpiContext?: OcpiRequestContext
    ocpiAuth?: OcpiAuthContext
  }
}
