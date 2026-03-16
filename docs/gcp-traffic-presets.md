# GCP Places and Locations presets

Outlayo alpha supports two GCP traffic-derived preset paths:

- `gcp-places`
- `gcp-locations`

These are request-level estimates that complement the existing GCP billing and API-usage connectors.

## Example

```ts
import { setupPresetFetch } from "@outlayo/sdk-ingest";

const outlayo = setupPresetFetch({
  presets: [
    { name: "gcp-places", pricePerRequestUsd: 0.017 },
    { name: "gcp-locations", pricePerRequestUsd: 0.005 }
  ]
});
```

## What Outlayo collects and stores

Collected locally during preset extraction:

- sanitized endpoint class for matching Google Maps API calls
- request counts
- configured price-per-request estimates

Stored in normalized events:

- `vendor=gcp`
- `service=places-api` or `service=geocoding-api`
- `metric=requests`
- quantity, estimated `cost_usd`, `source_ref`
- minimized confidence/pricing metadata

Not stored by default:

- raw request bodies
- raw response payloads
- API keys
- full unsanitized query strings

## Reconciliation path

Use the existing GCP billing export and API-usage connectors for stronger authority and free-tier context.
