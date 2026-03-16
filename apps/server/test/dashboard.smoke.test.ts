import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteStore } from "@outlayo/store-sqlite";
import { createApp } from "../src/app.js";

describe("dashboard smoke", () => {
  const stores: SQLiteStore[] = [];

  afterEach(async () => {
    while (stores.length) {
      await stores.pop()!.close();
    }
  });

  it("renders dashboard html with seeded spend", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();
    await store.upsertCostEvents([
      {
        ts: "2026-03-02T00:00:00.000Z",
        vendor: "openai",
        service: "gpt-4o-mini",
        metric: "tokens",
        quantity: 3000,
        cost_usd: 2.5,
        source_ref: "smoke-1",
        meta: {}
      }
    ]);

    await store.recordConnectorRun({
      connector: "openai",
      ran_at: "2026-03-02T00:01:00.000Z",
      success: true,
      error: null
    });

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null,
      now: () => new Date("2026-03-05T00:00:00.000Z")
    });

    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Outlayo");
    expect(response.text).toContain("Connector health");
    expect(response.text).toContain("$2.50");
    expect(response.text).toContain("7d spend");
    expect(response.text).toContain("Top vendor");
    expect(response.text).toContain("Last successful sync");
    expect(response.text).toContain("Show zero days");

    const withZeroDays = await request(app).get("/?showZeroDays=1");
    expect(withZeroDays.status).toBe(200);
    expect(withZeroDays.text).toContain("Hide zero days");
    expect(withZeroDays.text).toContain("2026-03-01");
    expect(withZeroDays.text).toContain("$0.00");
  });

  it("hides disabled connectors from dashboard health rows even when history exists", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    await store.upsertCostEvents([
      {
        ts: "2026-03-10T00:00:00.000Z",
        vendor: "openai",
        service: "gpt-4o-mini",
        metric: "tokens",
        quantity: 1200,
        cost_usd: 1.5,
        source_ref: "smoke-2",
        meta: {}
      }
    ]);

    await store.recordConnectorRun({
      connector: "openai",
      ran_at: "2026-03-10T07:43:03.916Z",
      success: true,
      error: null
    });
    await store.recordConnectorRun({
      connector: "mapbox",
      ran_at: "2026-03-10T07:43:04.100Z",
      success: false,
      error: "stale credential error"
    });

    const app = createApp({
      store,
      connectors: [{ name: () => "openai", poll: async (_since, _until, _ctx) => [] }],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null,
      now: () => new Date("2026-03-10T08:00:00.000Z")
    });

    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("openai");
    expect(response.text).not.toContain("Mapbox");
    expect(response.text).not.toContain("stale credential error");
  });

  it("renders chart mode selector, alternate modes, and invalid mode fallback", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    await store.upsertCostEvents([
      {
        ts: "2026-03-09T00:00:00.000Z",
        vendor: "openai",
        service: "gpt-4o-mini",
        metric: "tokens",
        quantity: 100,
        cost_usd: 0.5,
        source_ref: "chart-1",
        meta: {}
      },
      {
        ts: "2026-03-10T00:00:00.000Z",
        vendor: "cloudflare",
        service: "workers",
        metric: "requests",
        quantity: 200,
        cost_usd: 0.75,
        source_ref: "chart-2",
        meta: {}
      },
      {
        ts: "2026-03-11T00:00:00.000Z",
        vendor: "supabase",
        service: "database",
        metric: "rows",
        quantity: 300,
        cost_usd: 0.25,
        source_ref: "chart-3",
        meta: {}
      }
    ]);

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null,
      now: () => new Date("2026-03-12T00:00:00.000Z")
    });

    const bars = await request(app).get("/?chart=bars");
    expect(bars.status).toBe(200);
    expect(bars.text).toContain("Daily spend (bars)");
    expect(bars.text).toContain('aria-current="page"');
    expect(bars.text).toContain('>Bars</a>');
    expect(bars.text).toContain('data-chart-mode="bars"');

    const line = await request(app).get("/?chart=line");
    expect(line.status).toBe(200);
    expect(line.text).toContain("Daily spend (line)");
    expect(line.text).toContain('data-chart-mode="line"');

    const area = await request(app).get("/?chart=area");
    expect(area.status).toBe(200);
    expect(area.text).toContain("Daily spend (area)");
    expect(area.text).toContain('data-chart-mode="area"');

    const invalid = await request(app).get("/?chart=banana");
    expect(invalid.status).toBe(200);
    expect(invalid.text).toContain("Daily spend (stacked by vendor)");
    expect(invalid.text).toContain('aria-current="page"');
    expect(invalid.text).toContain('>Rows</a>');
    expect(invalid.text).toContain('data-chart-mode="rows"');
  });
});
