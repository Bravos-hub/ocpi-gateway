OCPI Kafka Topics and Payload Contracts

Topics
- ocpi.partner.events
- ocpi.credentials.events
- ocpi.command.requests
- ocpi.command.events
- ocpi.session.events
- ocpi.cdr.events
- ocpi.location.events
- ocpi.tariff.events
- ocpi.token.events
- ocpi.chargingprofile.events
- ocpi.error.events

Envelope (OcpiEvent)
```json
{
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7A",
  "eventType": "ocpi.command.result",
  "source": "ocpi-gateway",
  "occurredAt": "2026-01-18T02:10:00Z",
  "correlationId": "cmd_01HZXH2J8W1J6J9N5M8T8Z1E7A",
  "tenantId": "tenant_123",
  "partnerId": "partner_456",
  "partyId": "ABC",
  "countryCode": "US",
  "role": "EMSP",
  "module": "commands",
  "direction": "OUTBOUND",
  "payload": {}
}
```

Command Request (ocpi.command.requests)
```json
{
  "requestId": "cmd_01HZXH2J8W1J6J9N5M8T8Z1E7A",
  "tenantId": "tenant_123",
  "partnerId": "partner_456",
  "command": "START_SESSION",
  "responseUrl": "https://emsp.example.com/ocpi/commands/START_SESSION/123",
  "payload": {
    "location_id": "LOC1",
    "evse_uid": "EVSE1",
    "token": { "uid": "123" }
  },
  "requestedAt": "2026-01-18T02:10:00Z"
}
```

Command Result (ocpi.command.events)
```json
{
  "requestId": "cmd_01HZXH2J8W1J6J9N5M8T8Z1E7A",
  "partnerId": "partner_456",
  "command": "START_SESSION",
  "result": "ACCEPTED",
  "occurredAt": "2026-01-18T02:10:05Z",
  "payload": {
    "message": "Accepted by CPO"
  }
}
```

Session Event (ocpi.session.events)
```json
{
  "partnerId": "partner_456",
  "sessionId": "sess_123",
  "status": "ACTIVE",
  "occurredAt": "2026-01-18T02:10:10Z",
  "payload": {
    "energy_kwh": 1.2
  }
}
```

CDR Event (ocpi.cdr.events)
```json
{
  "partnerId": "partner_456",
  "cdrId": "cdr_123",
  "sessionId": "sess_123",
  "occurredAt": "2026-01-18T03:10:10Z",
  "payload": {
    "total_cost": 8.4,
    "currency": "USD"
  }
}
```
