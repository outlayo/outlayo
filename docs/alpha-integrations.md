# Alpha Integration Support Matrix

Outlayo alpha is intentionally narrow. These are the integrations we expect real testers to use first.

| Integration | Lane | Current alpha path | Notes |
|---|---|---|---|
| OpenAI | dual-path | preset + connector | best-supported reference integration |
| Mapbox | traffic-first + optional connector | preset + alpha connector | connector remains estimated/alpha-oriented |
| GCP Places | dual-path | preset + gcp usage/billing connector | preset emits request-level estimates |
| GCP Locations | dual-path | preset + gcp usage/billing connector | alpha preset maps to geocoding-style usage |
| Resend | traffic-first | preset | best practical source is app traffic |
| Supabase | authority-first | connector | useful reconciliation/authority path, weak preset fit |

## What "supported in alpha" means

- we intend to test these in the wild first
- docs and onboarding should explicitly cover them
- confidence semantics are part of the product, not hidden caveats

## What is not implied

- it does not mean every integration has perfect billing authority
- it does not mean every integration has both preset and connector support
- it does not mean broader roadmap items are abandoned
