import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { HealthModule } from './modules/health/health.module'
import { OcpiModule } from './modules/ocpi/ocpi.module'
import { DatabaseModule } from './platform/database.module'
import { KafkaModule } from './platform/kafka.module'
import { RedisModule } from './platform/redis.module'
import { EvzoneApiModule } from './platform/evzone-api.module'
import { LocationsModule } from './modules/locations/locations.module'
import { TariffsModule } from './modules/tariffs/tariffs.module'
import { TokensModule } from './modules/tokens/tokens.module'
import { SessionsModule } from './modules/sessions/sessions.module'
import { CdrsModule } from './modules/cdrs/cdrs.module'
import { OcpiCoreModule } from './modules/ocpi/core/ocpi-core.module'
import { OcpiContextMiddleware } from './modules/ocpi/core/ocpi-context.middleware'
import { CommandsModule } from './modules/commands/commands.module'
import { ChargingProfilesModule } from './modules/charging-profiles/charging-profiles.module'
import { HubClientInfoModule } from './modules/hub-client-info/hub-client-info.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    OcpiCoreModule,
    DatabaseModule,
    KafkaModule,
    RedisModule,
    EvzoneApiModule,
    OcpiModule,
    LocationsModule,
    TariffsModule,
    TokensModule,
    SessionsModule,
    CdrsModule,
    CommandsModule,
    ChargingProfilesModule,
    HubClientInfoModule,
    HealthModule,
  ],
  providers: [OcpiContextMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(OcpiContextMiddleware).forRoutes('*')
  }
}
