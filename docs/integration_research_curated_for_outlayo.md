# Curated Services for Outlayo (Pass Checklist)

Important interpretation note:

- This table is a research-screening artifact, not a build-order commitment.
- A service can pass the checklist and still be a low connector priority if authoritative billing coverage is weak.
- Outlayo now uses app-side interception as the primary coverage path and prioritizes connectors for reconciliation value where vendor telemetry is strong.
- Use `docs/integration-lane-strategy.md` and `docs/connector-priority-review.md` for the stricter lane-aware interpretation.

| integration_name | category | origin | usage_data_api_status | billing_data_api_status | confidence | proper_service | used_by_many_startups | pricing_or_free_tier_docs | has_programmatic_api | checklist_pass | evidence_url | audit_note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Amplitude | Product Analytics | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://www.docs.developers.amplitude.com | passes checklist for Outlayo target segment |
| Anthropic | AI APIs | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://docs.anthropic.com/ | passes checklist for Outlayo target segment |
| Asana | Documents & Productivity | broad-list | partial | unavailable | medium | yes | yes | yes | yes | yes | https://developers.asana.com/reference/rest-api-reference | passes checklist for Outlayo target segment |
| Auth0 | Authentication & Authorization | broad-list | unknown | unknown | low | yes | yes | yes | unknown | yes | https://auth0.com | passes checklist for Outlayo target segment |
| AWS Cost Explorer API | Cloud Billing | broad-list | partial | available | high | yes | yes | yes | yes | yes | https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_Operations_AWS_Cost_Explorer_Service.html | passes checklist for Outlayo target segment |
| Azure Consumption API | Cloud Billing | broad-list | available | available | high | yes | yes | yes | yes | yes | https://learn.microsoft.com/en-us/rest/api/consumption/ | passes checklist for Outlayo target segment |
| Clerk | Authentication & Authorization | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://clerk.com/docs | passes checklist for Outlayo target segment |
| Cloudflare | Infrastructure & Edge | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://developers.cloudflare.com/ | passes checklist for Outlayo target segment |
| Datadog | Observability | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://docs.datadoghq.com/api/latest/ | passes checklist for Outlayo target segment |
| DigitalOcean | Infrastructure & Cloud | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://docs.digitalocean.com/reference/api/ | passes checklist for Outlayo target segment |
| Fly.io | Infrastructure & Hosting | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://fly.io/docs/ | passes checklist for Outlayo target segment |
| GitHub | Development | broad-list | partial | available | medium | yes | yes | yes | yes | yes | https://docs.github.com/en/rest/billing/billing | passes checklist for Outlayo target segment |
| Gitlab | Development | broad-list | unknown | unknown | low | yes | yes | yes | yes | yes | https://docs.gitlab.com/ee/api/ | passes checklist for Outlayo target segment |
| Google Analytics | Business | broad-list | available | unavailable | high | yes | yes | yes | yes | yes | https://developers.google.com/analytics/devguides/reporting/data/v1 | passes checklist for Outlayo target segment |
| Google Cloud Billing Export | Cloud Billing | broad-list | partial | available | high | yes | yes | yes | yes | yes | https://cloud.google.com/billing/docs/how-to/export-data-bigquery | passes checklist for Outlayo target segment |
| Google Firebase | Development | broad-list | unknown | unknown | low | yes | yes | yes | yes | yes | https://firebase.google.com/docs | passes checklist for Outlayo target segment |
| Linear | Productivity | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://developers.linear.app/docs/graphql/working-with-the-graphql-api | passes checklist for Outlayo target segment |
| Mailchimp | Business | broad-list | available | unavailable | medium | yes | yes | yes | yes | yes | https://mailchimp.com/developer/marketing/api/reports/ | passes checklist for Outlayo target segment |
| Mixpanel | Product Analytics | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://developer.mixpanel.com | passes checklist for Outlayo target segment |
| MongoDB Atlas | Databases | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://www.mongodb.com/docs/atlas/ | passes checklist for Outlayo target segment |
| Neon | Databases | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://neon.tech/docs | passes checklist for Outlayo target segment |
| Netlify | Development | broad-list | unknown | unknown | low | yes | yes | yes | yes | yes | https://docs.netlify.com/api/get-started/ | passes checklist for Outlayo target segment |
| New Relic | Observability | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://docs.newrelic.com/docs/apis/ | passes checklist for Outlayo target segment |
| Notion | Documents & Productivity | broad-list | unavailable | unavailable | medium | yes | yes | yes | yes | yes | https://developers.notion.com/llms.txt | passes checklist for Outlayo target segment |
| OpenAI | AI APIs | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://platform.openai.com/docs/api-reference | passes checklist for Outlayo target segment |
| PagerDuty | Incident Management | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://developer.pagerduty.com/api-reference/ | passes checklist for Outlayo target segment |
| PlanetScale | Databases | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://planetscale.com/docs | passes checklist for Outlayo target segment |
| PostHog | Product Analytics | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://posthog.com/docs | passes checklist for Outlayo target segment |
| Postmark | Email | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://postmarkapp.com/developer | passes checklist for Outlayo target segment |
| QuickBooks Online | Accounting | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account | passes checklist for Outlayo target segment |
| Railway | Infrastructure & Hosting | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://docs.railway.com | passes checklist for Outlayo target segment |
| Render | Infrastructure & Hosting | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://render.com/docs | passes checklist for Outlayo target segment |
| Resend | Email | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://resend.com/docs | passes checklist for Outlayo target segment |
| Segment | Customer Data Platform | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://segment.com/docs/ | passes checklist for Outlayo target segment |
| Sendgrid | Email | broad-list | unknown | unknown | low | yes | yes | yes | yes | yes | https://docs.sendgrid.com/api-reference/ | passes checklist for Outlayo target segment |
| Sentry | Observability | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://docs.sentry.io/ | passes checklist for Outlayo target segment |
| Shopify | Commerce | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://shopify.dev/docs/api | passes checklist for Outlayo target segment |
| Stripe | Payments | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://docs.stripe.com/api | passes checklist for Outlayo target segment |
| Supabase | Infrastructure & Developer Platform | added-popular | partial | partial | high | yes | yes | yes | yes | yes | https://supabase.com/docs | passes checklist for Outlayo target segment |
| Twilio | Communications | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://www.twilio.com/docs | passes checklist for Outlayo target segment |
| Upstash | Databases & Queues | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://upstash.com/docs | passes checklist for Outlayo target segment |
| Vercel | Infrastructure & Hosting | added-popular | partial | unavailable | high | yes | yes | yes | yes | yes | https://vercel.com/docs | passes checklist for Outlayo target segment |
| Xero | Accounting | added-popular | partial | available | high | yes | yes | yes | yes | yes | https://developer.xero.com/documentation/ | passes checklist for Outlayo target segment |
