# Milestone-2 Infrastructure Connectors

Outlayo now supports configuration and runtime wiring for:

- Supabase
- Vercel
- Render
- Railway
- Cloudflare

These connectors normalize provider usage/cost records into `cost_events` and include confidence metadata.

## Environment variables

```bash
SUPABASE_ENABLED=false
SUPABASE_PROJECT_REF=
SUPABASE_ACCESS_TOKEN=
SUPABASE_BASE_URL=

VERCEL_ENABLED=false
VERCEL_TOKEN=
VERCEL_TEAM_ID=
VERCEL_BASE_URL=

RENDER_ENABLED=false
RENDER_API_KEY=
RENDER_OWNER_ID=
RENDER_BASE_URL=

RAILWAY_ENABLED=false
RAILWAY_API_TOKEN=
RAILWAY_PROJECT_ID=
RAILWAY_BASE_URL=

CLOUDFLARE_ENABLED=false
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_BASE_URL=
```

## Note on coverage

Provider API completeness varies. Some records may be estimated/partial; rely on confidence fields in API/dashboard for interpretation.

## What Outlayo collects and stores

For Supabase, Vercel, Render, Railway, and Cloudflare, Outlayo collects only provider usage, subscription, plan, or cost rows returned by those vendor APIs.

Stored in normalized events:

- timestamped vendor/service/metric fields
- usage quantities and `cost_usd` values when the provider exposes them
- deterministic `source_ref`
- confidence metadata indicating authoritative, estimated, fallback, or reconciled context

Not stored by default:

- API tokens
- raw authorization headers
- unrelated project/application payloads outside the returned vendor billing or usage records
