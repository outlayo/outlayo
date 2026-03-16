# Connect OpenAI to Outlayo

This guide explains how to configure OpenAI ingestion in Outlayo and troubleshoot common auth/scope issues.

## 1) Configure environment variables

Required:

- `OPENAI_ENABLED=true`
- `OPENAI_API_KEY=<your key>`

Optional:

- `OPENAI_PROJECT=<project-id>` (use when your org/account expects project-scoped auth)

Example:

```bash
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-...
OPENAI_PROJECT=proj_abc123
```

## 2) Start Outlayo

```bash
pnpm run dev
```

Expected behavior:
- Server starts
- Scheduler runs `openai` connector
- Dashboard/API show OpenAI spend + usage (`tokens`)

## 3) Validate ingestion

1. Open `http://127.0.0.1:8787`
2. Check connector health section for `openai`
3. Call `/api/summary` and verify:
   - `summary.by_vendor` includes `openai`
   - `usageSummary` includes `openai` with `metric=tokens`

## What Outlayo collects and stores

Collected from OpenAI connector calls:

- usage or spend rows returned by OpenAI endpoints
- project-scoping context when configured

Stored in normalized events:

- timestamped vendor/service/metric fields
- token usage quantities
- normalized `cost_usd`
- deterministic `source_ref`
- confidence and connector metadata

Not stored by default:

- prompt text
- model responses
- your API key
- raw request headers

## Troubleshooting

- **`OPENAI_API_KEY is required` at startup**
  - Ensure `.env` exists and `OPENAI_API_KEY` is set.
  - Ensure no surrounding quotes/newlines in the key value.

- **`OpenAI usage poll failed: 401`**
  - Key may be invalid, expired, or missing required scope for usage endpoints.
  - Verify account/org/project setup for usage access.

- **`OpenAI usage poll failed: 403`**
  - Usually indicates auth is valid but forbidden in current project/org context.
  - Check `OPENAI_PROJECT` and project-level permissions.

- **`Invalid time value` / timestamp parsing issues**
  - Connector already handles ISO + unix timestamps; if this recurs, share sample payload fields for parsing patch.

- **No OpenAI rows in dashboard**
  - Confirm scheduler is running and connector health is green.
  - Confirm usage actually exists in the queried interval.
