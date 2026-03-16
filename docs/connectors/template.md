# Connector Package Template

Use this template for new vendor connectors as workspace packages under `packages/connector-<vendor>`.

## Package shape

- `package.json` with name `@outlayo/connector-<vendor>`
- `src/index.ts` exporting a class implementing `Connector` from `@outlayo/core`
- `src/index.test.ts` with fixture-based normalization tests

## Required interface

```ts
class VendorConnector implements Connector {
  name(): string;
  poll(since: Date, until: Date, ctx: ConnectorContext): Promise<CostEvent[]>;
  healthcheck?(): Promise<void>;
}
```

## Normalization rules

- Emit `CostEvent` with all required fields: `ts`, `vendor`, `service`, `metric`, `quantity`, `cost_usd`, `source_ref`, `meta`
- Use stable `source_ref` from vendor identifiers where possible
- Set `meta.estimated = true` when cost is estimated rather than authoritative

## Integration steps

1. Add the package to `packages/`
2. Register in `apps/server/src/registry.ts`
3. Add fixture/unit tests for late-arriving data and replay idempotency
