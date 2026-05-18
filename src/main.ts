import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { OcpiExceptionFilter } from './modules/ocpi/core/ocpi-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const corsOrigins = buildCorsOrigins()
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      callback(null, isCorsOriginAllowed(origin, corsOrigins))
    }
  })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.useGlobalFilters(new OcpiExceptionFilter())

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3003
  await app.listen(port)
}

function buildCorsOrigins(): string[] {
  const configured = parseOriginList(process.env.OCPI_CORS_ORIGINS || process.env.CORS_ORIGINS)
  if (configured.length > 0) {
    return configured.map(normalizeOrigin)
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('OCPI_CORS_ORIGINS must be configured in production')
  }

  return ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']
}

function parseOriginList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function normalizeOrigin(origin: string): string {
  if (origin === '*') {
    throw new Error('Wildcard CORS origins are not allowed')
  }

  const parsed = new URL(origin)
  return parsed.origin
}

function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true
  }

  try {
    return allowedOrigins.includes(new URL(origin).origin)
  } catch {
    return false
  }
}

bootstrap()
