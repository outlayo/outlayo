# CLI Onboarding

Outlayo CLI provides guided setup for self-host users.

## Commands

- `outlayo init` - interactive connector selection and `.env` generation/update
- `outlayo doctor` - validate enabled connector configuration

## Local usage from repo

```bash
pnpm run cli -- --help
pnpm run cli -- init --env .env
pnpm run cli -- doctor --env .env
```

## What `init` does

- prompts for admin token
- asks which connectors to enable
- asks for required keys per selected connector
- updates `.env` while preserving unrelated existing keys

## What `doctor` checks

- enabled connector list
- required fields for each enabled connector
- exits non-zero when issues are found
