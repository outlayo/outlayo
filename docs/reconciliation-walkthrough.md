# Reconciliation Walkthrough

This example shows how Outlayo's confidence model works in practice.

## Step 1: app-side interception emits an estimated event

Your app calls a vendor API through `instrumentFetchWithPresets(...)`.

Outlayo ingests an event like:

- `vendor=openai`
- `metric=tokens.total`
- `cost_usd=1.80`
- `meta.confidence=estimated`

At this point, you already have a useful live signal in the dashboard.

## Step 2: connector data arrives later

Later, a direct vendor connector or billing feed contributes a stronger signal, for example:

- `vendor=openai`
- `metric=connector_cost`
- `cost_usd=1.74`
- `meta.confidence=authoritative`

This does not make the original event useless. It improves context.

## Step 3: confidence summary tells you what you are looking at

In the dashboard and summary API, you can now see:

- `estimated`: app-side or inferred events
- `authoritative`: direct vendor or billing-feed events
- `reconciled`: events that carry explicit reconciliation context

## Why this model matters

Most vendors do not expose clean, real-time billing telemetry for every workload.

So Outlayo does not force a false choice between:

- waiting for perfect billing APIs, or
- trusting estimates with no validation path

Instead, it uses:

1. ingest-first coverage for speed
2. authoritative connectors where available
3. confidence labels so teams know what is exact vs inferred

## Related docs

- `docs/app-side-auto-intercept.md`
- `docs/10-minute-quickstart.md`
- `docs/self-host-golden-path.md`
