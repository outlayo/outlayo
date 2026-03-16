# Mapbox alpha setup

Outlayo supports Mapbox in alpha as a traffic-first integration with optional connector-based estimated usage polling.

## Connector env vars

```bash
MAPBOX_ENABLED=true
MAPBOX_TOKEN=your-token
MAPBOX_USERNAME=your-mapbox-username
MAPBOX_PRICING_JSON={"geocoding.requests":0.00075,"requests":0.001}
MAPBOX_BASE_URL=https://api.mapbox.com
```

## Preset path

Use the SDK preset when your app makes Mapbox requests directly:

```ts
import { setupPresetFetch } from "@outlayo/sdk-ingest";

const outlayo = setupPresetFetch({
  presets: [{
    name: "mapbox",
    pricingByServiceMetric: {
      "geocoding.requests": 0.00075
    }
  }]
});
```

## What Outlayo collects and stores

Collected by the preset path:

- sanitized Mapbox endpoint class
- request counts for matching Mapbox API calls
- optional pricing-rule inputs you configure locally

Collected by the connector path:

- Mapbox usage rows returned by Mapbox usage endpoints

Stored in normalized events:

- timestamped vendor/service/metric fields
- request or usage quantities
- estimated `cost_usd`
- deterministic `source_ref`
- confidence and pricing metadata

Not stored by default:

- raw request bodies
- raw response bodies
- auth tokens
- full unsanitized URLs

## Alpha note

Mapbox is included in alpha because it scratches a real geospatial usage pain, but it should be treated as traffic-first / estimated unless vendor-side authority improves.
