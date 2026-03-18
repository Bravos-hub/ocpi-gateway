import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { OcpiExceptionFilter } from './modules/ocpi/core/ocpi-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.useGlobalFilters(new OcpiExceptionFilter())

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003
  await app.listen(port)
}

bootstrap()
