# Integration Lane Strategy

Outlayo now classifies integrations by signal truth model, not by whether they merely have an API.

## The three lanes

### Traffic-first

Use this lane when app traffic is the best practical source of truth.

- outbound app calls are meaningfully correlated with cost or usage
- vendor-side reconciliation is weak, partial, or may never become strong
- presets still make sense because they give users actionable visibility

Examples:

- Resend
- PostHog
- Segment
- Sentry
- Mixpanel
- Amplitude
- Google Analytics
- Mailchimp

### Dual-path

Use this lane when both of these are true:

- app traffic is meaningfully useful for spend or usage estimation
- vendor-side telemetry is strong enough to reconcile against later

Examples:

- OpenAI
- Anthropic
- Twilio
- Postmark
- Stripe (with caveats)
- API-specific GCP usage surfaces such as Places and Geocoding

### Authority-first

Use this lane when app traffic is weak or misleading as a proxy, but authoritative vendor-side feeds are still valuable.

Examples:

- AWS Cost Explorer API
- Azure Consumption API
- Google Cloud Billing Export
- Supabase
- Cloudflare
- Vercel
- Render
- Railway

## Decision rule

- Build a preset if app traffic itself is meaningfully useful.
- Upgrade the integration to `dual-path` if strong reconciliation exists.
- Keep it `traffic-first` if traffic is useful but reconciliation is weak.
- Use `authority-first` when app traffic is a poor proxy for bill reality.

## Why this matters

This prevents two common mistakes:

1. building presets for services where app traffic is a bad proxy
2. rejecting useful traffic-derived presets just because reconciliation is weak

Outlayo is strongest when it is explicit about what kind of truth it has.
