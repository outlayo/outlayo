# 10-Minute Quickstart

Use this path if you want first signal fast, not a full production rollout.

Important: the `curl` example below is only for fast proof. Real integrations should use the SDK helpers in `docs/app-side-auto-intercept.md` so users do not manually craft Outlayo ingest calls.

## Goal

In one session, you will:

- start Outlayo locally
- send app-side usage events into `/api/ingest/events`
- see spend/usage/confidence show up in the dashboard

## 1) Install and start

```bash
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:8787`.

## 2) Send one batch of example usage

```bash
curl -X POST "http://127.0.0.1:8787/api/ingest/events" \
  -H "content-type: application/json" \
  --data '{
    "events": [
      {
        "ts": "2026-03-10T10:00:00.000Z",
        "vendor": "openai",
        "service": "chat.completions",
        "metric": "tokens.total",
        "quantity": 12000,
        "cost_usd": 1.80,
        "source_ref": "quickstart-openai-est-1",
        "confidence": "estimated",
        "meta": { "extraction_preset": "openai", "model": "gpt-4o-mini" }
      },
      {
        "ts": "2026-03-10T10:05:00.000Z",
        "vendor": "openai",
        "service": "billing-reconcile",
        "metric": "connector_cost",
        "quantity": 1,
        "cost_usd": 1.74,
        "source_ref": "quickstart-openai-auth-1",
        "confidence": "authoritative",
        "meta": { "connector": "openai" }
      }
    ]
  }'
```

## 3) Verify first signal

- dashboard: `http://127.0.0.1:8787`
- summary API: `http://127.0.0.1:8787/api/summary`
- event export: `http://127.0.0.1:8787/api/export/cost-events?vendor=openai`

You should now see:

- spend totals
- usage rows
- confidence summary with both `estimated` and `authoritative` events

## 4) Next step

- For preset-driven interception, go to `docs/app-side-auto-intercept.md`
- For a fuller operator setup, go to `docs/self-host-golden-path.md`
- For a simple explanation of estimated vs authoritative vs reconciled, go to `docs/reconciliation-walkthrough.md`
