export const OCPI_STATUS_CODES = {
  SUCCESS: 1000,
  CLIENT_ERROR: 2000,
  INVALID_OR_MISSING_PARAMETERS: 2001,
  NOT_ENOUGH_INFORMATION: 2002,
  UNKNOWN_LOCATION: 2003,
  UNKNOWN_TOKEN: 2004,
  SERVER_ERROR: 3000,
  UNABLE_TO_USE_CLIENT_API: 3001,
  UNSUPPORTED_VERSION: 3002,
  NO_MATCHING_ENDPOINTS: 3003,
} as const

export type OcpiStatusCode = (typeof OCPI_STATUS_CODES)[keyof typeof OCPI_STATUS_CODES]

export const OCPI_SUPPORTED_VERSIONS = ['2.2.1', '2.1.1'] as const
export type OcpiVersion = (typeof OCPI_SUPPORTED_VERSIONS)[number]

export const OCPI_MODULE_IDS = [
  'credentials',
  'locations',
  'sessions',
  'cdrs',
  'tariffs',
  'tokens',
  'commands',
  'chargingprofiles',
  'hubclientinfo',
] as const
export type OcpiModuleId = (typeof OCPI_MODULE_IDS)[number]

export const OCPI_FUNCTIONAL_MODULES = new Set<OcpiModuleId>([
  'locations',
  'sessions',
  'cdrs',
  'tariffs',
  'tokens',
  'commands',
  'chargingprofiles',
  'hubclientinfo',
])

export const isOcpiFunctionalModule = (value: string): value is OcpiModuleId =>
  OCPI_FUNCTIONAL_MODULES.has(value as OcpiModuleId)

export const OCPI_ALLOWED_ROLES = new Set(['cpo', 'emsp', 'hub', 'scsp', 'nsp', 'other'])
