OCPI Internal Backend Contracts

Purpose
- This file documents the internal backend API contracts expected by `ocpi-gateway`.
- Backend remains the source of truth; gateway is protocol facade and orchestrator.
- Base path: `/api/v1` is expected on backend internal OCPI routes.

Existing Contracts Used
- `GET/POST/PATCH /internal/ocpi/partners`
- `GET /internal/ocpi/locations`
- `POST/PATCH /internal/ocpi/partner-locations`
- `GET /internal/ocpi/tariffs`
- `POST /internal/ocpi/partner-tariffs`
- `GET /internal/ocpi/tokens`
- `GET/POST /internal/ocpi/partner-tokens`
- `POST /internal/ocpi/tokens/authorize`
- `GET /internal/ocpi/sessions`
- `POST /internal/ocpi/partner-sessions`
- `GET/POST /internal/ocpi/cdrs`

New Contracts Required by Full OCPI Scope
- Commands:
- `POST /internal/ocpi/commands/requests`
- `POST /internal/ocpi/commands/results`
- Charging Profiles:
- `GET /internal/ocpi/charging-profiles/{sessionId}`
- `PUT /internal/ocpi/charging-profiles/set`
- `POST /internal/ocpi/charging-profiles/clear`
- `POST /internal/ocpi/charging-profiles/results`
- `PUT /internal/ocpi/charging-profiles/active`
- Hub Client Info:
- `GET /internal/ocpi/hub-client-info`
- `GET /internal/ocpi/hub-client-info/object`
- `PUT /internal/ocpi/hub-client-info`
- Session sender preference update:
- `PUT /internal/ocpi/sessions/{sessionId}/charging-preferences`
- Tariff receiver delete:
- `POST /internal/ocpi/partner-tariffs/delete`
- CDR object fetch:
- `GET /internal/ocpi/cdrs/{cdrId}`

Core v1 Scope
- `ChargingProfiles` and `HubClientInfo` are intentionally disabled for core v1 and should return deterministic `module not supported` behavior when hit.

Partner Object Extensions Expected
- `version`
- `roles`
- `endpoints`
- `lastSyncAt`
- `status`

Idempotency Expectations
- Gateway uses Redis dedup keys for push/update endpoints.
- Backend should still implement idempotent write semantics for:
- partner-location updates
- partner-tariff updates/deletes
- partner-token updates
- partner-session updates
- CDR creates
- command requests/results
- charging profile set/clear/results/active updates
- hub client info updates
