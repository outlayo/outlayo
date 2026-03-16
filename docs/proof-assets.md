# Proof Assets

This directory contains public proof assets used in the README and onboarding docs.

## What they show

- `docs/assets/landing-proof.svg`: a representative capture of the current landing-page value framing
- `docs/assets/dashboard-proof.svg`: a representative dashboard state showing estimated, authoritative, and reconciled signals together

## How they were produced

These assets are based on a real local app run with seeded example data, then redrawn as sanitized static SVG artifacts for repository-safe publishing.

Why not raw screenshots?

- local runs can include sensitive connector names, tokens, or error messages
- sanitized proof assets are safer to keep in the public repo
- the visuals still reflect the shipped interface and current product model

## Regeneration workflow

1. Start the local app.
2. Seed representative ingest data into `/api/ingest/events`.
3. Review `/landing` and `/` locally.
4. Update the SVG proof assets to match the current interface and safe public state.

If Playwright/browser capture is available in your environment, use it for visual reference during regeneration, but sanitize anything sensitive before committing proof assets.
