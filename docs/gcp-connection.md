# Connect GCP Billing Export to Outlayo

This guide explains how to connect the `gcp-billing` connector so Outlayo can ingest authoritative costs from BigQuery Billing Export.

## 1) Enable Billing Export in GCP

1. Open **Cloud Billing** in Google Cloud Console.
2. Select your billing account.
3. Go to **Billing export**.
4. Enable **Detailed usage cost data** (BigQuery export).
5. Choose the destination project and dataset.

Notes:
- Export table names are created by GCP (for example: `gcp_billing_export_v1_<billing_account_id>`).
- Data can take time to appear initially.

## 2) Create or choose a service account

Create a service account that Outlayo will use to run BigQuery queries.

Recommended roles (minimum practical set):
- `roles/bigquery.jobUser` on the project where queries run
- `roles/bigquery.dataViewer` on the billing export dataset

If your billing export dataset is in a different project, grant dataset-level access there too.

## 3) Configure Outlayo environment variables

Set these variables:

- `GCP_ENABLED=true`
- `GCP_PROJECT_ID=<project-id-containing-export-or-query-context>`
- `GCP_BILLING_DATASET=<billing_export_dataset>`
- `GCP_BILLING_TABLE=<billing_export_table>`
- `GCP_API_USAGE_ENABLED=true` (optional, enables Places/Geocoding free-tier tracking)
- `GCP_FREE_TIER_LIMITS_JSON={"places-api":50000,"geocoding-api":50000}` (required if API usage enabled)

Credentials (choose one):
- `GCP_SERVICE_ACCOUNT_JSON=<single-line service account json>`
- `GCP_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`

### Example (`.env`)

```bash
GCP_ENABLED=true
GCP_PROJECT_ID=my-billing-project
GCP_BILLING_DATASET=billing_export
GCP_BILLING_TABLE=gcp_billing_export_v1_123ABC_456DEF_7890AB
GCP_SERVICE_ACCOUNT_FILE=./secrets/gcp-sa.json
GCP_API_USAGE_ENABLED=true
GCP_FREE_TIER_LIMITS_JSON={"places-api":50000,"geocoding-api":50000}
```

## 4) Start Outlayo

```bash
pnpm run dev
```

You should see scheduler logs for `gcp-billing` and connector health in the dashboard.

## 5) Validate ingestion

1. Open `http://127.0.0.1:8787`
2. Confirm connector health shows `gcp-billing`
3. Check `/api/summary` and verify:
   - `summary.by_vendor` includes `gcp`
   - `usageSummary` includes a `gcp` row (typically `metric=sku_cost`)
   - `freeTierSummary` includes `places-api` and `geocoding-api` when enabled

## What Outlayo collects and stores

Collected from GCP sources:

- BigQuery billing export cost rows
- API usage/free-tier rows for configured services such as Places and Geocoding when enabled

Stored in normalized events:

- timestamped vendor/service/metric fields
- usage quantities and authoritative `cost_usd` from billing export rows
- deterministic `source_ref`
- minimal metadata needed for SKU/service attribution and confidence interpretation

Not stored by default:

- service account secret material
- raw credential JSON contents in event storage
- arbitrary BigQuery table contents outside queried billing/usage rows

## Troubleshooting

- **Startup validation error for GCP fields**
  - Ensure all required vars are set when `GCP_ENABLED=true`.

- **Permission denied / Access Denied (BigQuery)**
  - Verify the service account has `bigquery.jobUser` and dataset `dataViewer`.

- **No GCP rows showing up**
  - Confirm billing export is enabled and data has landed in the selected table.
  - Check date window and timezone assumptions in source data.

- **No free-tier data appears**
  - Ensure `GCP_API_USAGE_ENABLED=true`.
  - Ensure `GCP_FREE_TIER_LIMITS_JSON` has API keys exactly matching normalized names:
    - `places-api`
    - `geocoding-api`
  - Confirm export table includes relevant usage records for these services.

- **Invalid JSON credentials**
  - If using `GCP_SERVICE_ACCOUNT_JSON`, ensure JSON is valid and properly escaped.

- **Running in Docker**
  - If using `GCP_SERVICE_ACCOUNT_FILE`, mount the file into the container and set the in-container path.
