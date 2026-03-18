const normalizeRegion = (value?: string): 'china' | 'global' =>
  value?.trim().toLowerCase() === 'china' ? 'china' : 'global'

export default () => ({
  platform: {
    region: normalizeRegion(process.env.REGION),
    smsProvider:
      (process.env.SMS_PROVIDER || '').trim().toLowerCase() ||
      (normalizeRegion(process.env.REGION) === 'china' ? 'submail' : 'twilio'),
    mediaProvider:
      (process.env.MEDIA_PROVIDER || '').trim().toLowerCase() ||
      (normalizeRegion(process.env.REGION) === 'china' ? 'disabled' : 'cloudinary'),
    dataPlane:
      (process.env.DATA_PLANE || '').trim().toLowerCase() ||
      (normalizeRegion(process.env.REGION) === 'china' ? 'china' : 'global'),
  },
  service: {
    name: process.env.SERVICE_NAME || 'ocpi-gateway',
  },
  http: {
    port: parseInt(process.env.PORT || '3003', 10),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/evzone',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean),
    clientId: process.env.KAFKA_CLIENT_ID || 'ocpi-gateway',
    groupId: process.env.KAFKA_GROUP_ID || 'ocpi-gateway',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.REDIS_PREFIX || 'ocpi',
  },
  backend: {
    baseUrl: process.env.EVZONE_BACKEND_URL || '',
    apiPrefix: process.env.EVZONE_BACKEND_API_PREFIX || '/api/v1',
    tokenPath: process.env.EVZONE_BACKEND_TOKEN_PATH || '/auth/service/token',
    clientId: process.env.EVZONE_SERVICE_CLIENT_ID || '',
    clientSecret: process.env.EVZONE_SERVICE_CLIENT_SECRET || '',
    scopes: process.env.EVZONE_SERVICE_SCOPES || 'ocpi:read ocpi:write ocpi:commands',
    timeoutMs: parseInt(process.env.EVZONE_BACKEND_TIMEOUT_MS || '5000', 10),
  },
  ocpi: {
    baseUrlCpo: process.env.OCPI_BASE_URL_CPO || 'http://localhost:3003/ocpi/cpo/2.2.1',
    baseUrlEmsp: process.env.OCPI_BASE_URL_EMSP || 'http://localhost:3003/ocpi/emsp/2.2.1',
    baseUrlHub: process.env.OCPI_BASE_URL_HUB || 'http://localhost:3003/ocpi/hub/2.2.1',
    partyId: process.env.OCPI_PARTY_ID || 'EVZ',
    countryCode: process.env.OCPI_COUNTRY_CODE || 'US',
    businessName: process.env.OCPI_BUSINESS_NAME || 'EVzone',
    timeZone: process.env.OCPI_TIME_ZONE || 'UTC',
    defaultConnectorStandard: process.env.OCPI_DEFAULT_CONNECTOR_STANDARD || 'IEC_62196_T2',
    defaultConnectorFormat: process.env.OCPI_DEFAULT_CONNECTOR_FORMAT || 'SOCKET',
    defaultConnectorPowerType: process.env.OCPI_DEFAULT_CONNECTOR_POWER_TYPE || 'AC_3_PHASE',
    defaultConnectorVoltage: process.env.OCPI_DEFAULT_CONNECTOR_VOLTAGE || '400',
    defaultConnectorAmperage: process.env.OCPI_DEFAULT_CONNECTOR_AMPERAGE || '32',
    outboundTimeoutMs: parseInt(process.env.OCPI_OUTBOUND_TIMEOUT_MS || '5000', 10),
    outboundRetryMax: parseInt(process.env.OCPI_OUTBOUND_RETRY_MAX || '3', 10),
    credentialsTokenEncoding:
      (process.env.OCPI_CREDENTIALS_TOKEN_ENCODING || 'BASE64').trim().toUpperCase(),
    acceptPlainCredentialsToken:
      (process.env.OCPI_ACCEPT_PLAIN_CREDENTIALS_TOKEN || 'true').trim().toLowerCase() ===
      'true',
    requireRoutingHeaders:
      (process.env.OCPI_REQUIRE_ROUTING_HEADERS || 'false').trim().toLowerCase() === 'true',
    enableModuleCommands:
      (process.env.OCPI_ENABLE_MODULE_COMMANDS || 'true').trim().toLowerCase() === 'true',
    enableModuleChargingProfiles:
      (process.env.OCPI_ENABLE_MODULE_CHARGINGPROFILES || 'false').trim().toLowerCase() ===
      'true',
    enableModuleHubClientInfo:
      (process.env.OCPI_ENABLE_MODULE_HUBCLIENTINFO || 'false').trim().toLowerCase() ===
      'true',
  },
  admin: {
    token: process.env.OCPI_ADMIN_TOKEN || process.env.INTERNAL_ADMIN_TOKEN || '',
    serviceJwtSecret: process.env.JWT_SERVICE_SECRET || '',
    serviceJwtIssuer: process.env.JWT_SERVICE_ISSUER || '',
    serviceJwtAudience: process.env.JWT_SERVICE_AUDIENCE || '',
  },
})
