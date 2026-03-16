import { describe, expect, it } from "vitest";
import type { Connector, CostEvent, Store } from "@outlayo/core";
import { startScheduler } from "../src/scheduler.js";

function makeStore(): Store {
  const events: CostEvent[] = [];
  const runs: Array<{ connector: string; success: boolean; error: string | null }> = [];
  return {
    migrate: async () => {},
    upsertCostEvents: async (incoming) => {
      events.push(...incoming);
      return incoming.length;
    },
    recordConnectorRun: async (run) => {
      runs.push({ connector: run.connector, success: run.success, error: run.error });
    },
    getConnectorHealth: async () => [],
    getMtdSummary: async () => ({ mtd_total_usd: 0, by_vendor: [], daily: [] }),
    getMtdUsageSummary: async () => [],
    getCostEvents: async () => events,
    close: async () => {},
    __runs: runs
  } as Store & { __runs: Array<{ connector: string; success: boolean; error: string | null }> };
}

describe("scheduler retry behavior", () => {
  it("retries transient connector failures with backoff", async () => {
    const store = makeStore() as Store & { __runs: Array<{ connector: string; success: boolean; error: string | null }> };
    let attempts = 0;
    const connector: Connector = {
      name: () => "retry-demo",
      poll: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("transient failure");
        }
        return [
          {
            ts: "2026-03-14T00:00:00.000Z",
            vendor: "retry-demo",
            service: "service",
            metric: "requests",
            quantity: 1,
            cost_usd: 0,
            source_ref: "evt",
            meta: {}
          }
        ];
      }
    };

    const scheduler = startScheduler({
      intervalMinutes: 999,
      connectors: [connector],
      store,
      maxRetries: 2,
      retryBaseMs: 1,
      sleep: async () => {}
    });

    await scheduler.tickNow();
    scheduler.stop();

    expect(attempts).toBeGreaterThanOrEqual(2);
    expect(store.__runs.some((r) => r.connector === "retry-demo" && r.success)).toBe(true);
  });
});
