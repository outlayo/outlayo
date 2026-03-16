# AWS Cost Explorer connector setup

Outlayo can ingest AWS Cost Explorer grouped usage/cost data as normalized `cost_events` with vendor `aws`.

## Required env vars

```bash
AWS_COST_EXPLORER_ENABLED=true
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

Optional:

```bash
AWS_SESSION_TOKEN=...
AWS_COST_EXPLORER_ENDPOINT=https://ce.us-east-1.amazonaws.com
```

## Notes

- If enabled without access key or secret, startup validation fails.
- Connector uses AWS SigV4 request signing for Cost Explorer API calls.
- Events are normalized with metric `usage_quantity` and authoritative cost values.

## What Outlayo collects and stores

Collected from AWS Cost Explorer:

- grouped usage quantities
- grouped cost amounts
- service/dimension values returned by AWS queries

Stored in normalized events:

- timestamped vendor/service/metric fields
- usage quantities and authoritative `cost_usd`
- deterministic `source_ref`
- minimal connector metadata needed for attribution

Not stored by default:

- access key or secret values
- raw SigV4 headers
- unrelated AWS account resources outside returned cost rows
