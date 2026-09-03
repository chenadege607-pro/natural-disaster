# Backend layer (`src/backend`)

Isolated server-only backend. Nothing here may be imported from a React component.
Only server functions (`src/lib/*.functions.ts`) and server routes (`src/routes/api/**`)
may import from this folder, and always with a dynamic `await import(...)` inside a handler.

```
src/backend
  config.server.ts              env access + provider selection
  providers/
    open-meteo.server.ts        weather + flood (GloFAS) data source
    sms/
      types.ts                  shared transport contract
      twilio.server.ts          Twilio REST transport
      gatewayapi.server.ts      GatewayAPI transport
      africastalking.server.ts  Africa's Talking transport
      simulated.server.ts       no-credential fallback (logs only)
      index.server.ts           provider selection + delivery + audit log
  forecast/
    model.server.ts             rainfall/discharge/terrain -> risk model
    refresh.server.ts           fetch -> normalize -> persist locality_forecasts
```

Every file ends in `.server.ts` so the bundler's import protection keeps it out of
client bundles.
