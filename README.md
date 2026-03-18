# OCPI Gateway

A standalone OCPI integration gateway for roaming and partner connectivity.

## Features
- NestJS service with OCPI 2.2.1 and 2.1.1 endpoint support.
- Versions + Credentials registration/update/unregister flows.
- Functional modules: Locations, Tariffs, Tokens, Sessions, CDRs, Commands, ChargingProfiles, HubClientInfo.
- OCPI request context handling: `X-Request-ID`, `X-Correlation-ID`, routing headers.
- Partner token authentication guard for functional OCPI modules.
- Idempotency controls for push/update operations (Redis-backed).
- Backend integration via `/internal/ocpi/*` contracts.

## Quick Start

```bash
npm install
cp .env.example .env
npm run start:dev
```

Service runs on `http://localhost:3003`.

## Main OCPI Endpoints
- Versions:
  - `GET /ocpi/versions`
  - `GET /ocpi/{role}/versions` (`cpo`, `emsp`, `hub`)
  - `GET /ocpi/{role}/{version}`
- Credentials:
  - `POST|GET|PUT|DELETE /ocpi/{role}/{version}/credentials`
- Locations:
  - `GET /ocpi/{role}/{version}/locations`
  - `GET /ocpi/{role}/{version}/locations/{location_id}`
  - `PUT|PATCH /ocpi/{role}/{version}/locations/{country_code}/{party_id}/{location_id}[/{evse_uid}][/{connector_id}]`
- Tariffs:
  - `GET /ocpi/{role}/{version}/tariffs`
  - `GET /ocpi/{role}/{version}/tariffs/{tariff_id}`
  - `PUT|DELETE /ocpi/{role}/{version}/tariffs/{country_code}/{party_id}/{tariff_id}`
- Tokens:
  - `GET /ocpi/{role}/{version}/tokens`
  - `GET|PUT|PATCH /ocpi/{role}/{version}/tokens/{country_code}/{party_id}/{token_uid}`
  - `POST /ocpi/{role}/{version}/tokens/{token_uid}/authorize`
- Sessions:
  - `GET /ocpi/{role}/{version}/sessions`
  - `GET /ocpi/{role}/{version}/sessions/{session_id}`
  - `PUT|PATCH /ocpi/{role}/{version}/sessions/{country_code}/{party_id}/{session_id}`
  - `PUT /ocpi/{role}/{version}/sessions/{session_id}/charging_preferences`
- CDRs:
  - `POST /ocpi/{role}/{version}/cdrs`
  - `GET /ocpi/{role}/{version}/cdrs`
  - `GET /ocpi/{role}/{version}/cdrs/{cdr_id}`
- Commands:
  - `POST /ocpi/{role}/{version}/commands/{command}`
  - `POST /ocpi/{role}/{version}/commands/{command}/{request_id}`
- ChargingProfiles:
  - `GET|PUT|DELETE /ocpi/{role}/{version}/chargingprofiles/{session_id}`
  - `POST /ocpi/{role}/{version}/chargingprofiles/{session_id}/callback/{request_id}`
  - `PUT /ocpi/{role}/{version}/chargingprofiles/{session_id}/active`
- HubClientInfo:
  - `GET /ocpi/{role}/{version}/hubclientinfo`
  - `GET|PUT /ocpi/{role}/{version}/hubclientinfo/{country_code}/{party_id}`
- Partner admin:
  - `POST|GET /partners`
  - `GET|PATCH|DELETE /partners/{id}`

## Environment Variables
- Core:
  - `DATABASE_URL`
  - `KAFKA_BROKERS`
  - `REDIS_URL`
- OCPI URLs and identity:
  - `OCPI_BASE_URL_CPO`
  - `OCPI_BASE_URL_EMSP`
  - `OCPI_BASE_URL_HUB`
  - `OCPI_PARTY_ID`
  - `OCPI_COUNTRY_CODE`
  - `OCPI_BUSINESS_NAME`
- OCPI protocol behavior:
  - `OCPI_CREDENTIALS_TOKEN_ENCODING`
  - `OCPI_ACCEPT_PLAIN_CREDENTIALS_TOKEN`
  - `OCPI_REQUIRE_ROUTING_HEADERS`
  - `OCPI_ENABLE_MODULE_COMMANDS`
  - `OCPI_ENABLE_MODULE_CHARGINGPROFILES`
  - `OCPI_ENABLE_MODULE_HUBCLIENTINFO`
- Backend integration:
  - `EVZONE_BACKEND_URL`
  - `EVZONE_BACKEND_TOKEN_PATH`
  - `EVZONE_SERVICE_CLIENT_ID`
  - `EVZONE_SERVICE_CLIENT_SECRET`
  - `EVZONE_SERVICE_SCOPES`
  - `EVZONE_BACKEND_TIMEOUT_MS`
