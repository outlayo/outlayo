# App-Side Auto Intercept Guide

Use this flow to configure `@outlayo/sdk-ingest`, intercept relevant HTTP calls, and deliver usage events to Outlayo.

Outlayo recommends this app-side interception path as the primary usage signal. Keep vendor connectors enabled where available for authoritative reconciliation.

You do not need to handcraft raw HTTP posts to Outlayo in the normal path. Manual posting is supported, but it is the escape hatch, not the default integration model.

## Supported runtime shape

This SDK path is currently strongest in fetch-based runtimes, including:

- Next.js and plain Node runtimes using `fetch`
- Remix
- SvelteKit
- Nuxt server routes that use `fetch`
- Express, Fastify, Hono, or custom servers when outbound traffic goes through `fetch`
- edge-style runtimes with a standard `fetch` implementation

Not first-class yet:

- axios-specific interception
- native `http` / `https` client interception
- framework-specific zero-config adapters beyond the generic fetch helper path

## Alpha presets available now

- `openai`
- `mapbox`
- `gcp-places`
- `gcp-locations`
- `resend`

Preset setup docs:

- `docs/mapbox-connection.md`
- `docs/gcp-traffic-presets.md`
- `docs/resend-preset.md`

## Mental model

- app-side interception gives broad coverage fast
- preset extractors turn live request/response traffic into normalized usage events
- connector polling adds higher-confidence vendor data where public telemetry is strong
- confidence labels help you see what is estimated, authoritative, or reconciled

## Privacy by default

Outlayo's default preset model is local extraction plus minimized event forwarding, not raw traffic proxying.

By default, built-in presets do not forward:

- raw request bodies
- raw response bodies
- auth headers or tokens
- full unsanitized URLs with query strings

Instead, they emit normalized metering events such as vendor, service, metric, quantity, cost estimate, timestamp, confidence, and small allowlisted metadata fields.

## What the OpenAI preset collects and stores

Collected locally during extraction:

- request method
- sanitized endpoint class
- model name when available
- token usage fields returned by the provider

Stored in Outlayo events by default:

- `ts`
- `vendor`
- `service`
- `metric`
- `quantity`
- `cost_usd`
- `source_ref` (sanitized, no query string)
- limited metadata such as confidence flags, model, token counts, and pricing-applied indicators

Not stored by default:

- prompt text
- completion text
- raw request/response JSON
- auth headers
- full URLs with query parameters

## 1) Configure tracker

### Simplest setup: env-driven helper

```ts
import { setupPresetFetch } from "@outlayo/sdk-ingest";

const outlayo = setupPresetFetch({
  presets: [{ name: "openai" }]
});

const trackedFetch = outlayo.fetch;
```

Expected env vars:

- `OUTLAYO_INGEST_ENDPOINT`
- `OUTLAYO_ADMIN_TOKEN` (optional when your server requires it)
- `OUTLAYO_ADMIN_HEADER_NAME` (optional override)
- `OUTLAYO_BATCH_SIZE` (optional)
- `OUTLAYO_FLUSH_INTERVAL_MS` (optional)
- `OUTLAYO_MAX_QUEUE_SIZE` (optional)

### Optional global install

```ts
import { installGlobalFetchTracking } from "@outlayo/sdk-ingest";

const outlayo = installGlobalFetchTracking({
  presets: [{ name: "openai" }]
});

// later
await outlayo.flush();
outlayo.restore();
```

### Low-level tracker setup

```ts
import { createUsageTracker } from "@outlayo/sdk-ingest";

const tracker = createUsageTracker({
  endpoint: "http://127.0.0.1:8787/api/ingest/events",
  adminToken: process.env.OUTLAYO_ADMIN_TOKEN,
  batchSize: 50,
  flushIntervalMs: 3000
});
```

## 2) Wrap fetch and extract usage

```ts
import { instrumentFetch } from "@outlayo/sdk-ingest";

const trackedFetch = instrumentFetch(fetch, {
  tracker,
  match: ({ url }) => url.includes("api.openai.com"),
  extractors: [
    ({ url, method, response }) => {
      if (!response) return [];
      return [
        {
          ts: new Date().toISOString(),
          vendor: "openai",
          service: "chat.completions",
          metric: "requests",
          quantity: 1,
          cost_usd: 0,
          source_ref: `${method}:${url}:${Date.now()}`
        }
      ];
    }
  ]
});
```

Use `trackedFetch` where you want outbound calls instrumented.

## 2b) Use built-in presets (no custom extractor code)

```ts
import { instrumentFetchWithPresets } from "@outlayo/sdk-ingest";

const trackedFetch = instrumentFetchWithPresets(fetch, {
  tracker,
  presets: [
    {
      name: "openai",
      pricingByModel: {
        "gpt-4o-mini": { inputUsdPer1k: 0.15, outputUsdPer1k: 0.6 }
      }
    }
  ]
});
```

Preset-emitted events are tagged as estimated confidence by default so connector data can reconcile against them when available.

## 3) Flush on shutdown

```ts
await tracker.flush();
await tracker.shutdown();
```

## 4) Verify ingest path

1. Make a request through `trackedFetch`.
2. Check `GET /api/summary` and dashboard totals.
3. Confirm `/api/export/cost-events?vendor=openai` contains the emitted records.

For a short end-to-end first success, see `docs/10-minute-quickstart.md`.
For a concrete confidence example, see `docs/reconciliation-walkthrough.md`.

## Notes

- Keep `source_ref` deterministic where possible for idempotent upserts.
- Match only relevant domains/paths to reduce noise.
- Use `onError` in tracker config to surface validation or delivery failures in app logs/metrics.
