# Contributing to Outlayo

Thanks for contributing.

## Repo posture

This is the public OSS monorepo for Outlayo. The root package is marked `private` because the repository is not published as one npm package, not because contribution is closed.

## What belongs in this public repo

- OSS runtime and package improvements
- connector integrations and tests
- docs, examples, and developer experience improvements
- CLI and self-host workflows
- landing and public messaging improvements

## What does NOT belong in this public repo

- secrets or credentials
- production infrastructure state
- customer data or sensitive logs
- internal abuse or fraud controls
- anything that violates `docs/public-private-boundary.md`

See `docs/public-private-boundary.md` for the full boundary policy.

## Local workflow

1. Install dependencies: `pnpm install`
2. Run tests: `pnpm test`
3. Run targeted checks when relevant, such as `pnpm run verify:live`
4. Use OpenSpec for non-trivial changes that alter behavior, workflow, or architecture

## OpenSpec expectations

- create or continue a change for meaningful product/workflow modifications
- keep proposal, design, specs, and tasks aligned with implementation
- sync specs back to main specs when a change is complete
- archive completed changes after implementation and verification

## Pull request expectations

- keep changes focused and easy to review
- update docs when setup, UX, or behavior changes
- add or update tests when behavior changes
- explain validation clearly in the PR description
- avoid mixing unrelated refactors with feature or bug-fix work

## Security and responsible disclosure

- do not open public issues for vulnerabilities; follow `SECURITY.md`
- never commit `.env`, live credentials, tokens, or copied production data
- sanitize logs and examples before submitting them in issues or PRs

## Repo hygiene

- use `pnpm` as the primary contributor package manager
- do not commit local artifacts such as SQLite databases, temporary logs, or generated env files
- preserve established public/private repo boundaries when adding docs or tooling

## Architecture references

- `docs/oss-hosted-topology.md`
- `docs/self-host-vs-hosted.md`
- `docs/public-private-boundary.md`
- `docs/self-host-golden-path.md`
- `docs/connector-authoring-kit.md`
