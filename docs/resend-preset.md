# Resend preset setup

Outlayo supports Resend as a traffic-first preset in alpha.

## Example

```ts
import { setupPresetFetch } from "@outlayo/sdk-ingest";

const outlayo = setupPresetFetch({
  presets: [{ name: "resend", pricePerEmailUsd: 0.001 }]
});
```

## What Outlayo collects and stores

Collected locally during extraction:

- sanitized Resend endpoint class
- recipient count inferred from the outgoing request body
- response ID when available

Stored in normalized events:

- timestamped vendor/service/metric fields
- recipient-count quantity
- estimated `cost_usd`
- deterministic `source_ref`
- minimized confidence and pricing metadata

Not stored by default:

- email body content
- subject lines
- auth headers
- full raw request/response JSON

## Alpha note

Resend is traffic-first in alpha because app-originated send activity is the most useful signal today.
