import { afterEach, describe, expect, it } from "vitest";
import { SQLiteStore } from "./index.js";

describe("SQLiteStore", () => {
  const stores: SQLiteStore[] = [];

  afterEach(async () => {
    while (stores.length) {
      await stores.pop()!.close();
    }
  });

  it("enforces required fields", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    await expect(
      store.upsertCostEvents([
        {
          ts: "",
          vendor: "openai",
          service: "gpt-4o-mini",
          metric: "tokens",
          quantity: 1,
          cost_usd: 1,
          source_ref: "a",
          meta: {}
        }
      ])
    ).rejects.toThrow("Invalid cost event");
  });

  it("deduplicates by vendor and source_ref", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    const base = {
      ts: "2026-03-08T10:00:00.000Z",
      vendor: "openai",
      service: "gpt-4o-mini",
      metric: "tokens",
      quantity: 100,
      cost_usd: 1,
      source_ref: "dup",
      meta: {}
    };

    await store.upsertCostEvents([base, { ...base, cost_usd: 2 }]);
    const summary = await store.getMtdSummary(new Date("2026-03-08T11:00:00.000Z"));
    expect(summary.mtd_total_usd).toBe(2);
  });
});
