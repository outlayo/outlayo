# Outlayo Messaging Framework

## Who it is for

- technical founders who feel invoice pain before they build internal cost tooling
- indie hackers running usage-priced products on thin margins
- OSS-friendly infra owners who want a self-hostable visibility and reconciliation layer

## Core Problem

Usage-based spend is fragmented across app traffic, vendor dashboards, and partial billing APIs. Teams can see requests in one place, invoices in another, and often cannot answer "what is happening right now" with enough confidence to act.

## Core Value Proposition

Outlayo gives teams one operational control surface for usage-based spend.

- intercept app-side usage where the real signal already exists
- ingest normalized events into one store and dashboard
- pull authoritative vendor data where APIs are good enough
- reconcile estimated and authoritative signals so teams can act before invoices surprise them

## Why this matters now

Most services do not expose complete, startup-friendly billing telemetry through public APIs. A connector-only product will always have blind spots. Outlayo's advantage is that it does not wait for perfect vendor APIs to become useful.

## Founder / Indie Hacker / OSS Contributor Framing

### Startup founder
- You want to know which workload is driving cost before month-end, not after finance closes the books.
- You care about prevention more than perfect retrospective reporting.

### Indie hacker
- You do not want to build a bespoke spend pipeline just to understand API margin.
- You want a practical self-hosted tool that works even when vendors expose weak billing APIs.

### OSS contributor
- The project is interesting because it solves a real telemetry gap with open, inspectable logic.
- Contributions matter across SDK ingestion, connectors, docs, forecasting, and confidence modeling.

## OSS + Hosted Framing

- Outlayo is open-source and self-hostable for teams that want full control.
- Outlayo also offers a hosted app for teams that want managed operations.
- Product messaging must clearly separate public OSS capabilities from hosted operational responsibilities.

## Differentiation

1. Ingest-first coverage for the real world, not connector-only wishful thinking.
2. Authoritative where possible, estimated where necessary, reconciled when signals overlap.
3. One model for usage, spend, confidence, and alerts across vendors.

## Integration lane language

Use these terms consistently:

- `traffic-first`: app traffic is the best practical signal
- `dual-path`: app traffic is useful and strong reconciliation exists
- `authority-first`: vendor-side authority is the main trustworthy signal

Avoid language that implies every integration should have both a preset and a connector.

## Claim Guardrails

- Do say: "intercept app-side usage first, reconcile with vendor data where available."
- Do say: "authoritative where possible, estimated + reconciled where needed."
- Do not say: "exact real-time invoice totals for every vendor."
- Do not imply: "universal direct vendor billing API coverage."
- Do say: "built for technical teams running usage-priced products."

## Reusable Copy Blocks

### Hero
"Stop surprise usage bills before they hit your runway."

### Supporting line
"Outlayo intercepts app-side API usage, turns it into spend signals, and reconciles it with vendor data where trustworthy billing feeds exist."

### Primary CTA
"Request early access"

### Secondary CTA
"Explore the OSS repo"

### Proof line
"Built for startups and indie teams running OpenAI, cloud infra, and usage-priced APIs without a single source of truth."
