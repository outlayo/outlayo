# Outlayo OSS + Hosted Topology

This document defines how Outlayo is split between open-source surfaces and hosted product surfaces.

## Domain model

- `outlayo.com`: public website, docs, OSS onboarding, and contributor guidance.
- `app.outlayo.com`: hosted managed application access.

DNS and routing implementation details are operational concerns and do not need to be exposed publicly.

## Deployable surfaces

1. Public website/docs surface
   - landing pages
   - documentation
   - OSS installation and contribution guidance

2. OSS runtime surface
   - connectors
   - normalization/store/forecast packages
   - self-hostable server runtime

3. Hosted app surface
   - managed account/org experience
   - hosted operational workflows

## Repository model

This repository is intentionally public and contains:

- OSS packages and application code
- public docs and messaging
- contributor workflows

Private hosted operations stay outside this repository (see `docs/public-private-boundary.md`).
