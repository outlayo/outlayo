# Connector and Preset Priority Review

This review uses a stricter decision lens than earlier iterations.

Question 1: is app traffic itself meaningful enough to justify a preset?

Question 2: is vendor telemetry strong enough to justify reconciliation or connector work?

## Decision matrix

| Integration | Traffic fit | Reconciliation fit | Lane | Preset priority | Connector priority | Notes |
|---|---|---:|---|---:|---:|---|
| OpenAI | strong | strong | dual-path | 1 | 1 | strongest current fit in both lanes |
| Anthropic | strong | strong | dual-path | 2 | 2 | same shape as OpenAI, slightly weaker proof today |
| Twilio | strong | strong | dual-path | 3 | 6 | direct app calls map well to spend |
| Postmark | strong | strong | dual-path | 4 | 7 | clean transactional-email correlation |
| Stripe | medium | strong | dual-path | 5 | 10 | request traffic helps, but fees are not 1:1 with calls |
| GCP Places API | medium | strong | dual-path | 6 | 11 | useful only for API-specific usage surfaces |
| GCP Geocoding API | medium | strong | dual-path | 7 | 12 | narrow API-specific fit |
| Resend | strong | weak | traffic-first | 8 | 18 | useful preset even if reconciliation remains weak |
| PostHog | medium | weak | traffic-first | 9 | 19 | traffic-derived signal is still useful operationally |
| Segment | medium | weak | traffic-first | 10 | 20 | same logic as PostHog |
| Sentry | medium | weak | traffic-first | 11 | 16 | app-derived volume can still be useful |
| Mixpanel | medium | weak | traffic-first | 12 | 21 | traffic-first, not reconciliation-strong |
| Amplitude | medium | weak | traffic-first | 13 | 22 | similar to Mixpanel |
| Google Analytics | medium | weak | traffic-first | 14 | 23 | event volume is useful, billing authority is weak |
| Mailchimp | medium | weak | traffic-first | 15 | 24 | campaign activity may still justify traffic-first preset |
| AWS Cost Explorer API | weak | strong | authority-first | no | 3 | cloud bills are not well proxied by app egress |
| Azure Consumption API | weak | strong | authority-first | no | 4 | same rationale as AWS |
| Google Cloud Billing Export | weak | strong | authority-first | no | 5 | excellent authority, weak preset case |
| Supabase | weak | partial | authority-first | no | 8 | valuable connector, weak direct preset fit |
| Cloudflare | weak | partial | authority-first | no | 9 | edge/network bills are not cleanly request-equal |
| Vercel | weak | partial | authority-first | no | 13 | better as connector than preset |
| Render | weak | partial | authority-first | no | 14 | same |
| Railway | weak | partial | authority-first | no | 15 | same |
| Datadog | weak | medium | authority-first | no | 17 | observability cost is more billing-side than request-side |
| DigitalOcean | weak | medium | authority-first | no | 25 | useful connector, weak preset |

## Key takeaways

- A good connector target is often a bad preset target.
- Traffic-first is not a second-class lane; it is the primary truth source for some services.
- Authority-first connectors still matter, but they should not distort preset priority.
