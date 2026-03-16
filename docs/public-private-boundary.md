# Public vs Private Boundary Policy

This repository is public. Use these rules to decide what belongs here.

## Public (allowed in this repo)

- Application and package source code
- Connector logic and tests
- Public docs, examples, and architecture references
- Non-sensitive CI workflows and tooling

## Private (must NOT be committed here)

- Secrets and credentials (API keys, signing keys, DB passwords, webhook secrets)
- Production infrastructure state and secret manifests
- Customer data exports and sensitive logs
- Abuse/fraud detection controls and incident security runbooks

## Operating rules

1. Use a secret manager for hosted runtime values.
2. Never store production secret material in git history.
3. Keep production IaC state and environment overlays in private systems.
4. Treat any data that can identify tenants/users as private by default.

## Self-host vs hosted responsibility summary

- Self-host users own: deployment, patching, backup, uptime, and key management.
- Outlayo hosted service owns: managed operations for hosted tenants.
