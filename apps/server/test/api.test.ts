import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteStore } from "@outlayo/store-sqlite";
import { createApp } from "../src/app.js";

describe("server API contracts", () => {
  const stores: SQLiteStore[] = [];

  afterEach(async () => {
    while (stores.length) {
      await stores.pop()!.close();
    }
  });

  it("returns summary and forecast payload", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();
    await store.upsertCostEvents([
      {
        ts: "2026-03-01T10:00:00.000Z",
        vendor: "openai",
        service: "gpt-4o-mini",
        metric: "tokens",
        quantity: 1000,
        cost_usd: 1,
        source_ref: "a",
        meta: {}
      }
    ]);

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null,
      now: () => new Date("2026-03-10T00:00:00.000Z")
    });

    const res = await request(app).get("/api/summary");
    expect(res.status).toBe(200);
    expect(res.body.summary.mtd_total_usd).toBe(1);
    expect(res.body.usageSummary).toEqual([
      {
        vendor: "openai",
        metric: "tokens",
        quantity: 1000
      }
    ]);
    expect(res.body.confidenceSummary).toBeDefined();
    expect(res.body.forecast.confidence).toBe("low");
  });

  it("requires admin token when configured", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: "secret"
    });

    const unauthorized = await request(app).get("/api/summary");
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app).get("/api/summary").set("x-outlayo-admin-token", "secret");
    expect(authorized.status).toBe(200);
  });

  it("returns reconciled first-five vendor summary and independent connector health", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    await store.upsertCostEvents([
      {
        ts: "2026-03-02T10:00:00.000Z",
        vendor: "openai",
        service: "gpt-4o-mini",
        metric: "tokens",
        quantity: 1000,
        cost_usd: 1.25,
        source_ref: "openai-1",
        meta: {}
      },
      {
        ts: "2026-03-02T11:00:00.000Z",
        vendor: "gcp",
        service: "BigQuery",
        metric: "sku_cost",
        quantity: 3,
        cost_usd: 2.75,
        source_ref: "gcp-1",
        meta: {}
      },
      {
        ts: "2026-03-02T11:30:00.000Z",
        vendor: "anthropic",
        service: "claude-3-5-sonnet",
        metric: "tokens",
        quantity: 2000,
        cost_usd: 1.5,
        source_ref: "anthropic-1",
        meta: {}
      },
      {
        ts: "2026-03-02T12:00:00.000Z",
        vendor: "aws",
        service: "AmazonEC2",
        metric: "usage_quantity",
        quantity: 12,
        cost_usd: 3,
        source_ref: "aws-1",
        meta: {}
      },
      {
        ts: "2026-03-02T12:30:00.000Z",
        vendor: "azure",
        service: "Virtual Machines",
        metric: "D2 v5",
        quantity: 2,
        cost_usd: 0.5,
        source_ref: "azure-1",
        meta: {}
      }
    ]);

    await store.recordConnectorRun({
      connector: "openai",
      ran_at: "2026-03-02T11:05:00.000Z",
      success: true,
      error: null
    });
    await store.recordConnectorRun({
      connector: "gcp-billing",
      ran_at: "2026-03-02T11:05:00.000Z",
      success: false,
      error: "quota exceeded"
    });
    await store.recordConnectorRun({
      connector: "anthropic",
      ran_at: "2026-03-02T11:05:00.000Z",
      success: true,
      error: null
    });
    await store.recordConnectorRun({
      connector: "aws-cost-explorer",
      ran_at: "2026-03-02T11:05:00.000Z",
      success: true,
      error: null
    });
    await store.recordConnectorRun({
      connector: "azure-consumption",
      ran_at: "2026-03-02T11:05:00.000Z",
      success: false,
      error: "token expired"
    });

    const app = createApp({
      store,
      connectors: [
        { name: () => "openai", poll: async (_since, _until, _ctx) => [] },
        { name: () => "gcp-billing", poll: async (_since, _until, _ctx) => [] },
        { name: () => "anthropic", poll: async (_since, _until, _ctx) => [] },
        { name: () => "aws-cost-explorer", poll: async (_since, _until, _ctx) => [] },
        { name: () => "azure-consumption", poll: async (_since, _until, _ctx) => [] }
      ],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null,
      now: () => new Date("2026-03-10T00:00:00.000Z")
    });

    const summaryRes = await request(app).get("/api/summary");
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary.mtd_total_usd).toBe(9);
    const vendors = summaryRes.body.summary.by_vendor.map((v: { vendor: string }) => v.vendor).sort();
    expect(vendors).toEqual(["anthropic", "aws", "azure", "gcp", "openai"]);
    const usageKeys = summaryRes.body.usageSummary
      .map((r: { vendor: string; metric: string }) => `${r.vendor}:${r.metric}`)
      .sort();
    expect(usageKeys).toEqual([
      "anthropic:tokens",
      "aws:usage_quantity",
      "azure:D2 v5",
      "gcp:sku_cost",
      "openai:tokens"
    ]);

    const healthRes = await request(app).get("/api/health/connectors");
    expect(healthRes.status).toBe(200);
    const gcp = healthRes.body.connectorHealth.find((r: { connector: string }) => r.connector === "gcp-billing");
    const openai = healthRes.body.connectorHealth.find((r: { connector: string }) => r.connector === "openai");
    const azure = healthRes.body.connectorHealth.find((r: { connector: string }) => r.connector === "azure-consumption");
    expect(gcp.last_error).toBe("quota exceeded");
    expect(openai.last_error).toBeNull();
    expect(azure.last_error).toBe("token expired");
    expect(healthRes.body.subsystems).toBeDefined();
    expect(healthRes.body.subsystems.budget_alert.enabled).toBe(false);
  });

  it("hides historical health rows for disabled connectors from active health API output", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

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

    const healthRes = await request(app).get("/api/health/connectors");
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.connectorHealth).toEqual([
      {
        connector: "openai",
        last_success: "2026-03-10T07:43:03.916Z",
        last_error: null
      }
    ]);
    expect(healthRes.body.connectors).toEqual(["openai"]);
    expect(healthRes.body.subsystems.connectors).toEqual([
      {
        connector: "openai",
        last_success: "2026-03-10T07:43:03.916Z",
        last_error: null
      }
    ]);
  });

  it("exports cost events with filtering and bounded limits", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    await store.upsertCostEvents([
      {
        ts: "2026-03-02T10:00:00.000Z",
        vendor: "openai",
        service: "gpt-4o-mini",
        metric: "tokens",
        quantity: 1000,
        cost_usd: 1.25,
        source_ref: "exp-1",
        meta: {}
      },
      {
        ts: "2026-03-02T11:00:00.000Z",
        vendor: "gcp",
        service: "BigQuery",
        metric: "sku_cost",
        quantity: 3,
        cost_usd: 2.75,
        source_ref: "exp-2",
        meta: {}
      }
    ]);

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null
    });

    const filtered = await request(app).get("/api/export/cost-events?vendor=openai&limit=1");
    expect(filtered.status).toBe(200);
    expect(filtered.body.count).toBe(1);
    expect(filtered.body.events[0].vendor).toBe("openai");
    expect(filtered.body.events[0]).toMatchObject({
      ts: expect.any(String),
      service: expect.any(String),
      metric: expect.any(String),
      quantity: expect.any(Number),
      cost_usd: expect.any(Number),
      source_ref: expect.any(String),
      meta: expect.any(Object)
    });
  });

  it("accepts validated app-side ingest batches", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null
    });

    const response = await request(app)
      .post("/api/ingest/events")
      .send({
        events: [
          {
            ts: "2026-03-02T10:00:00.000Z",
            vendor: "custom-app",
            service: "api",
            metric: "requests",
            quantity: 120,
            cost_usd: 0.24,
            source_ref: "ing-1",
            confidence: "reconciled"
          }
        ]
      });

    expect(response.status).toBe(202);
    expect(response.body.accepted).toBe(1);

    const summary = await request(app).get("/api/summary");
    expect(summary.body.summary.by_vendor.some((v: { vendor: string }) => v.vendor === "custom-app")).toBe(true);
  });

  it("returns GCP free-tier proximity summary when limits configured", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    await store.upsertCostEvents([
      {
        ts: "2026-03-02T10:00:00.000Z",
        vendor: "gcp",
        service: "places-api",
        metric: "requests",
        quantity: 2000,
        cost_usd: 0,
        source_ref: "ft-1",
        meta: { usage_only: true }
      }
    ]);

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null,
      now: () => new Date("2026-03-10T00:00:00.000Z"),
      gcpFreeTierLimits: { "places-api": 50000 }
    });

    const res = await request(app).get("/api/summary");
    expect(res.status).toBe(200);
    expect(res.body.freeTierSummary).toHaveLength(1);
    expect(res.body.freeTierSummary[0]).toMatchObject({
      api: "places-api",
      limit: 50000,
      used: 2000
    });
  });
});
