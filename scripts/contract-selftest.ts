import { ConfigService } from '@nestjs/config'
import { OcpiService } from '../src/modules/ocpi/ocpi.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function createService(overrides?: {
  enableModuleCommands?: boolean
  enableModuleChargingProfiles?: boolean
  enableModuleHubClientInfo?: boolean
}) {
  const config = new ConfigService({
    ocpi: {
      baseUrlCpo: 'http://localhost:3003/ocpi/cpo/2.2.1',
      baseUrlEmsp: 'http://localhost:3003/ocpi/emsp/2.2.1',
      baseUrlHub: 'http://localhost:3003/ocpi/hub/2.2.1',
      enableModuleCommands: overrides?.enableModuleCommands ?? true,
      enableModuleChargingProfiles: overrides?.enableModuleChargingProfiles ?? false,
      enableModuleHubClientInfo: overrides?.enableModuleHubClientInfo ?? false,
    },
  })

  return new OcpiService(config, {} as never, {} as never, {} as never)
}

function endpointIdentifiers(payload: ReturnType<OcpiService['getVersionDetails']>): string[] {
  return (payload.data?.endpoints || []).map((endpoint) => endpoint.identifier as string)
}

function main() {
  const defaultService = createService()
  const versions = defaultService.getVersions('cpo')
  const versionIds = (versions.data || []).map((version) => version.version)
  assert(versionIds.length === 2, 'expected exactly two OCPI versions')
  assert(versionIds[0] === '2.2.1', 'expected OCPI 2.2.1 to be advertised first')
  assert(versionIds[1] === '2.1.1', 'expected OCPI 2.1.1 to be advertised second')

  const default221 = endpointIdentifiers(defaultService.getVersionDetails('cpo', '2.2.1'))
  assert(default221.includes('commands'), 'expected commands endpoint to be enabled by default')
  assert(
    !default221.includes('chargingprofiles'),
    'expected chargingprofiles endpoint to be disabled by default'
  )
  assert(
    !default221.includes('hubclientinfo'),
    'expected hubclientinfo endpoint to be disabled by default'
  )

  const fullService = createService({
    enableModuleChargingProfiles: true,
    enableModuleHubClientInfo: true,
  })
  const full221 = fullService.getVersionDetails('cpo', '2.2.1')
  const full221Ids = endpointIdentifiers(full221)
  assert(full221Ids.includes('chargingprofiles'), 'expected chargingprofiles endpoint in OCPI 2.2.1')
  assert(full221Ids.includes('hubclientinfo'), 'expected hubclientinfo endpoint in OCPI 2.2.1')

  const full211 = fullService.getVersionDetails('cpo', '2.1.1')
  const full211Endpoints = full211.data?.endpoints || []
  assert(
    full211Endpoints.every((endpoint) => !Object.prototype.hasOwnProperty.call(endpoint, 'role')),
    'expected OCPI 2.1.1 endpoints to omit role metadata'
  )
  assert(
    !endpointIdentifiers(full211).includes('chargingprofiles'),
    'expected chargingprofiles endpoint to stay out of OCPI 2.1.1'
  )

  console.log(JSON.stringify({ status: 'ok', test: 'contract-selftest' }))
}

main()
