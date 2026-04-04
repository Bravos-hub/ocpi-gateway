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
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7B",
  "eventType": "ocpi.session.import.upsert",
  "source": "ocpi-gateway",
  "correlationId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7B",
  "partnerId": "partner_456",
  "partyId": "ABC",
  "countryCode": "US",
  "role": "emsp",
  "module": "sessions",
  "direction": "INBOUND",
  "occurredAt": "2026-01-18T02:10:10Z",
  "payload": {
    "requestId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7B",
    "sessionId": "sess_123",
    "status": "ACTIVE"
  }
}
```

CDR Event (ocpi.cdr.events)
```json
{
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7C",
  "eventType": "ocpi.cdr.import.create",
  "source": "ocpi-gateway",
  "correlationId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7C",
  "partnerId": "partner_456",
  "partyId": "ABC",
  "countryCode": "US",
  "role": "emsp",
  "module": "cdrs",
  "direction": "INBOUND",
  "occurredAt": "2026-01-18T03:10:10Z",
  "payload": {
    "requestId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7C",
    "cdrId": "cdr_123",
    "sessionId": "sess_123"
  }
}
```

Tariff Event (ocpi.tariff.events)
```json
{
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7D",
  "eventType": "ocpi.tariff.export.list",
  "source": "ocpi-gateway",
  "correlationId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7D",
  "partnerId": "partner_456",
  "role": "emsp",
  "module": "tariffs",
  "direction": "OUTBOUND",
  "occurredAt": "2026-01-18T03:20:10Z",
  "payload": {
    "requestId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7D",
    "count": 4
  }
}
```

Location Event (ocpi.location.events)
```json
{
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7E",
  "eventType": "ocpi.location.import.patch",
  "source": "ocpi-gateway",
  "correlationId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7E",
  "partnerId": "partner_456",
  "partyId": "ABC",
  "countryCode": "US",
  "role": "emsp",
  "module": "locations",
  "direction": "INBOUND",
  "occurredAt": "2026-01-18T03:30:10Z",
  "payload": {
    "requestId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7E",
    "locationId": "LOC1",
    "evseUid": "EVSE1",
    "connectorId": "1",
    "objectType": "CONNECTOR"
  }
}
```

Token Event (ocpi.token.events)
```json
{
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7F",
  "eventType": "ocpi.token.authorize.result",
  "source": "ocpi-gateway",
  "correlationId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7F",
  "partnerId": "partner_456",
  "partyId": "ABC",
  "countryCode": "US",
  "role": "emsp",
  "module": "tokens",
  "direction": "INBOUND",
  "occurredAt": "2026-01-18T03:40:10Z",
  "payload": {
    "requestId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7F",
    "tokenUid": "tok_123",
    "tokenType": "RFID",
    "allowed": "ALLOWED",
    "found": true
  }
}
```

Credentials Event (ocpi.credentials.events)
```json
{
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7G",
  "eventType": "ocpi.credentials.update",
  "source": "ocpi-gateway",
  "correlationId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7G",
  "partnerId": "partner_456",
  "partyId": "ABC",
  "countryCode": "US",
  "role": "emsp",
  "module": "credentials",
  "direction": "INBOUND",
  "occurredAt": "2026-01-18T03:50:10Z",
  "payload": {
    "requestId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7G",
    "routeVersion": "2.2.1",
    "discoveredVersion": "2.2.1",
    "endpointCount": 7
  }
}
```

Partner Lifecycle Event (ocpi.partner.events)
```json
{
  "eventId": "evt_01HZXH2J8W1J6J9N5M8T8Z1E7H",
  "eventType": "ocpi.partner.credentials.update",
  "source": "ocpi-gateway",
  "correlationId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7H",
  "partnerId": "partner_456",
  "partyId": "ABC",
  "countryCode": "US",
  "role": "emsp",
  "module": "partners",
  "direction": "INBOUND",
  "occurredAt": "2026-01-18T04:00:10Z",
  "payload": {
    "requestId": "req_01HZXH2J8W1J6J9N5M8T8Z1E7H",
    "name": "Partner ABC",
    "status": "ACTIVE",
    "version": "2.2.1",
    "source": "credentials"
  }
}
```
