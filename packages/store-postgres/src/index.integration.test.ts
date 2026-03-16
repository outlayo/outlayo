import { describe, expect, it } from "vitest";
import { PostgresStore } from "./index.js";

const POSTGRES_URL = process.env.TEST_POSTGRES_URL;

describe("PostgresStore parity", () => {
  it.skipIf(!POSTGRES_URL)("can write and read summary", async () => {
    const store = new PostgresStore(POSTGRES_URL!);
    await store.migrate();

    await store.upsertCostEvents([
      {
        ts: "2026-03-08T10:00:00.000Z",
        vendor: "openai",
        service: "gpt-4o-mini",
        metric: "tokens",
        quantity: 100,
        cost_usd: 1.23,
        source_ref: `pg-${Date.now()}`,
        meta: {}
      }
    ]);

    const summary = await store.getMtdSummary(new Date("2026-03-08T11:00:00.000Z"));
    expect(summary.mtd_total_usd).toBeGreaterThan(0);
    await store.close();
  });
});
