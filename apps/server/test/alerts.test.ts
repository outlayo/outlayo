import { describe, expect, it, vi } from "vitest";
import type { Store } from "@outlayo/core";
import { createBudgetWebhookAlerter } from "../src/alerts.js";

function makeStore(total = 100): Store {
  return {
    migrate: async () => {},
    upsertCostEvents: async () => 0,
    recordConnectorRun: async () => {},
    getConnectorHealth: async () => [],
    getMtdSummary: async () => ({
      mtd_total_usd: total,
      by_vendor: [{ vendor: "openai", spend_usd: total }],
      daily: Array.from({ length: 8 }, (_v, i) => ({
        date: `2026-03-${String(i + 1).padStart(2, "0")}`,
        vendor: "openai",
        spend_usd: total / 8
      }))
    }),
    getMtdUsageSummary: async () => [],
    getCostEvents: async () => [],
    close: async () => {}
  };
}

describe("budget webhook alerter", () => {
  it("sends webhook when forecast exceeds budget", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const alerter = createBudgetWebhookAlerter({
      store: makeStore(160),
      budgetUsd: 100,
      webhookUrl: "https://example.com/webhook",
      cooldownHours: 24,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    await alerter.evaluate(new Date("2026-03-20T00:00:00.000Z"));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("suppresses duplicate alerts inside cooldown", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const alerter = createBudgetWebhookAlerter({
      store: makeStore(160),
      budgetUsd: 100,
      webhookUrl: "https://example.com/webhook",
      cooldownHours: 24,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    await alerter.evaluate(new Date("2026-03-20T00:00:00.000Z"));
    await alerter.evaluate(new Date("2026-03-20T02:00:00.000Z"));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends free-tier alerts and suppresses duplicates per API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const alerter = createBudgetWebhookAlerter({
      store: makeStore(0),
      budgetUsd: 999999,
      webhookUrl: "https://example.com/webhook",
      cooldownHours: 24,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      freeTierProvider: async () => [
        {
          api: "places-api",
          limit: 50000,
          projectedMonthEnd: 60000,
          projectedBreach: true,
          projectedOverage: 10000
        }
      ]
    });

    await alerter.evaluate(new Date("2026-03-20T00:00:00.000Z"));
    await alerter.evaluate(new Date("2026-03-20T01:00:00.000Z"));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
