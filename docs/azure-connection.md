# Azure Consumption connector setup

Outlayo can ingest Azure Consumption usage details as normalized `cost_events` with vendor `azure`.

## Required env vars

```bash
AZURE_CONSUMPTION_ENABLED=true
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_BEARER_TOKEN=your-azure-access-token
```

Optional:

```bash
AZURE_CONSUMPTION_BASE_URL=https://management.azure.com
```

## Notes

- If enabled without subscription ID or bearer token, startup validation fails.
- Events are normalized from usage details rows with authoritative cost fields when present.
- Refresh the bearer token on your own cadence if you are not using a managed credential flow.

## What Outlayo collects and stores

Collected from Azure Consumption:

- usage details rows returned by Azure APIs
- subscription-scoped cost and usage dimensions present in those rows

Stored in normalized events:

- timestamped vendor/service/metric fields
- usage quantities and authoritative `cost_usd` when available
- deterministic `source_ref`
- minimal connector metadata for attribution

Not stored by default:

- bearer token values
- raw authorization headers
- unrelated Azure resource payloads outside returned usage rows
