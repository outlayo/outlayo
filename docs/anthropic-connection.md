# Anthropic connector setup

Outlayo can ingest Anthropic usage/cost data as normalized `cost_events` with vendor `anthropic`.

## Required env vars

```bash
ANTHROPIC_ENABLED=true
ANTHROPIC_API_KEY=your-key
```

Optional:

```bash
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

## Notes

- If `ANTHROPIC_ENABLED=true` and `ANTHROPIC_API_KEY` is missing, startup validation fails.
- Events are normalized with metric `tokens` and include `meta.estimated=true` when provider cost is absent.

## What Outlayo collects and stores

Collected from Anthropic connector calls:

- provider usage and cost fields available from Anthropic APIs

Stored in normalized events:

- timestamped vendor/service/metric fields
- token usage quantities
- normalized `cost_usd`
- deterministic `source_ref`
- confidence metadata, including estimated markers when cost is inferred

Not stored by default:

- prompt text
- model responses
- API key values
- raw request headers
