# Integration Rollout Plan

This plan separates preset work from connector work.

## Preset rollout plan

### Milestone P1: Strongest dual-path API vendors

- OpenAI
- Anthropic
- Twilio
- Postmark

Goal: start with the services where app traffic is strongly meaningful and reconciliation is also credible.

### Milestone P2: High-value but narrower dual-paths

- Stripe
- GCP Places API
- GCP Geocoding API

Goal: extend presets where traffic is useful but interpretation needs more care.

### Milestone P3: Traffic-first visibility layer

- Resend
- PostHog
- Segment
- Sentry
- Mixpanel
- Amplitude
- Google Analytics
- Mailchimp

Goal: cover services where app traffic is still the best practical signal even if reconciliation remains weak.

## Connector rollout plan

### Milestone C1: Authority core

- OpenAI
- Anthropic
- AWS Cost Explorer API
- Azure Consumption API
- Google Cloud Billing Export

Goal: establish the highest-confidence reconciliation layer first.

### Milestone C2: Revenue and communications reconciliation

- Twilio
- Postmark
- Stripe

Goal: close the loop on high-volatility vendor spend with strong operational value.

### Milestone C3: Startup infrastructure reconciliation

- Supabase
- Cloudflare
- Vercel
- Render
- Railway

Goal: add authority-first startup infra connectors after the core billing lane.

## Interpretation notes

- A service being high on the preset list does not mean it should be high on the connector list.
- A service being high on the connector list does not mean it deserves a preset.
- The lane model is the source of truth: `traffic-first`, `dual-path`, `authority-first`.
