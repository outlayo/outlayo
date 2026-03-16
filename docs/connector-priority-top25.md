# Outlayo Integration Priorities (Lane-Aware)

This file no longer tries to force one universal order across presets and connectors.

Instead, use the lane model:

- `traffic-first`
- `dual-path`
- `authority-first`

## Strongest-first preset priorities

These are the best candidates for SDK preset work.

1. OpenAI
2. Anthropic
3. Twilio
4. Postmark
5. Stripe
6. GCP Places API
7. GCP Geocoding API
8. Resend
9. PostHog
10. Segment
11. Sentry
12. Mixpanel
13. Amplitude
14. Google Analytics
15. Mailchimp

## Strongest-first connector priorities

These are the best candidates for authoritative reconciliation work.

1. OpenAI
2. Anthropic
3. AWS Cost Explorer API
4. Azure Consumption API
5. Google Cloud Billing Export
6. Twilio
7. Postmark
8. Supabase
9. Cloudflare
10. Stripe
11. GCP Places API
12. GCP Geocoding API
13. Vercel
14. Render
15. Railway
16. Sentry
17. Datadog
18. Resend
19. PostHog
20. Segment
21. Mixpanel
22. Amplitude
23. Google Analytics
24. Mailchimp
25. DigitalOcean

## Why the lists differ

- some services are excellent preset targets but weak connector targets
- some services are excellent connector targets but poor preset targets
- forcing one combined rank makes both decisions worse

Use `docs/connector-priority-review.md` for the actual decision matrix.
