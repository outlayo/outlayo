# Connector Authoring Kit

This guide defines the minimal contract for contributing a connector.

## Package layout

Create `packages/connector-<vendor>/` with:

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/index.test.ts`

## Required implementation contract

- Implement `Connector` from `@outlayo/core`.
- `name()` returns stable connector name.
- `poll(since, until, ctx)` returns normalized `CostEvent[]`.
- Add `healthcheck()` for required config validation.

## Normalization requirements

- Use stable `vendor` and `service` labels.
- Use deterministic `source_ref` (prefer provider event IDs).
- Populate confidence metadata in `meta`:
  - `confidence`: `authoritative` | `estimated` | `reconciled`
  - `authoritative`: boolean
  - `estimated`: boolean
  - `reconciled`: boolean

## Test harness expectations

- Unit test successful normalization path.
- Unit test upstream failure behavior.
- Add at least one idempotency-oriented test when source identity is transformed.

## Runtime wiring checklist

1. Add tsconfig path alias in `tsconfig.base.json`.
2. Extend `AppConfig` and `loadConfig` env parsing.
3. Add validation for required connector env vars.
4. Register connector in `apps/server/src/registry.ts`.
5. Add `.env.example` variables and README setup notes.
