import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ConfidenceSummary, Connector, CostEvent, IngestBatchInput, Store } from "@outlayo/core";
import { forecastMonthEnd } from "@outlayo/forecaster";
import { renderDashboard } from "./ui.js";
import { computeFreeTierStatus } from "./freeTier.js";

export function createApp(params: {
  store: Store;
  connectors: Connector[];
  now?: () => Date;
  adminHeaderName: string;
  adminToken: string | null;
  alertingEnabled?: boolean;
  gcpFreeTierLimits?: Record<string, number>;
}) {
  const app = express();
  const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
  app.use(express.json());
  app.use("/static", express.static(publicDir));

  function normalizeChartMode(value: unknown): "rows" | "bars" | "line" | "area" {
    return value === "bars" || value === "line" || value === "area" ? value : "rows";
  }

  function getActiveConnectorHealth<T extends { connector: string }>(rows: T[]): T[] {
    const enabled = new Set(params.connectors.map((connector) => connector.name()));
    return rows.filter((row) => enabled.has(row.connector));
  }

  app.use((req, res, next) => {
    if (!params.adminToken) {
      next();
      return;
    }
    const token = req.header(params.adminHeaderName);
    if (token !== params.adminToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });

  function monthWindow(now: Date): { since: string; until: string } {
    return {
      since: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
      until: now.toISOString()
    };
  }

  function computeConfidenceSummary(events: CostEvent[]): ConfidenceSummary {
    const buckets = new Map<string, { count: number; cost: number }>();
    for (const event of events) {
      const confidence =
        typeof event.meta?.confidence === "string"
          ? String(event.meta.confidence)
          : event.meta?.reconciled === true
            ? "reconciled"
            : event.meta?.authoritative === true
              ? "authoritative"
              : "estimated";
      const prev = buckets.get(confidence) ?? { count: 0, cost: 0 };
      prev.count += 1;
      prev.cost += Number(event.cost_usd ?? 0);
      buckets.set(confidence, prev);
    }
    return {
      by_confidence: [...buckets.entries()].map(([confidence, stats]) => ({
        confidence: confidence as "authoritative" | "estimated" | "reconciled",
        event_count: stats.count,
        cost_usd: Number(stats.cost.toFixed(6))
      }))
    };
  }

  function parseIngestBatch(body: unknown): IngestBatchInput {
    if (!body || typeof body !== "object" || !Array.isArray((body as { events?: unknown[] }).events)) {
      throw new Error("Body must be an object with an events array");
    }
    const events = (body as { events: unknown[] }).events;
    if (events.length === 0 || events.length > 5000) {
      throw new Error("events length must be between 1 and 5000");
    }
    const parsed = events.map((event) => {
      if (!event || typeof event !== "object") {
        throw new Error("each event must be an object");
      }
      const row = event as Record<string, unknown>;
      const ts = String(row.ts ?? "");
      if (!ts || Number.isNaN(new Date(ts).getTime())) {
        throw new Error("event.ts must be a valid ISO timestamp");
      }
      const vendor = String(row.vendor ?? "");
      const service = String(row.service ?? "");
      const metric = String(row.metric ?? "");
      const source_ref = String(row.source_ref ?? "");
      const quantity = Number(row.quantity);
      const cost_usd = Number(row.cost_usd);
      if (!vendor || !service || !metric || !source_ref) {
        throw new Error("event vendor/service/metric/source_ref are required");
      }
      if (!Number.isFinite(quantity) || !Number.isFinite(cost_usd)) {
        throw new Error("event quantity and cost_usd must be numeric");
      }
      const confidence =
        row.confidence === "authoritative" || row.confidence === "estimated" || row.confidence === "reconciled"
          ? row.confidence
          : undefined;
      const meta =
        row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
          ? { ...(row.meta as Record<string, unknown>) }
          : {};
      if (confidence) {
        meta.confidence = confidence;
        meta.authoritative = confidence === "authoritative";
        meta.estimated = confidence !== "authoritative";
        meta.reconciled = confidence === "reconciled";
      }
      return {
        ts,
        vendor,
        service,
        metric,
        quantity,
        cost_usd,
        source_ref,
        meta
      };
    });
    return { events: parsed };
  }

  app.get("/api/summary", async (_req, res) => {
    const now = params.now?.() ?? new Date();
    const summary = await params.store.getMtdSummary(now);
    const usageSummary = await params.store.getMtdUsageSummary(now);
    const forecast = forecastMonthEnd(now, summary.daily);
    const connectorHealth = await params.store.getConnectorHealth();
    const freeTierSummary = params.gcpFreeTierLimits
      ? await computeFreeTierStatus({ store: params.store, now, limits: params.gcpFreeTierLimits })
      : [];
    const window = monthWindow(now);
    const confidenceSummary = computeConfidenceSummary(
      await params.store.getCostEvents({ since: window.since, until: window.until, limit: 5000 })
    );
    res.json({
      summary,
      usageSummary,
      freeTierSummary,
      confidenceSummary,
      forecast,
      connectorHealth,
      lastUpdated: now.toISOString()
    });
  });

  app.post("/api/ingest/events", async (req, res) => {
    try {
      const payload = parseIngestBatch(req.body);
      const accepted = await params.store.upsertCostEvents(payload.events.map((event) => ({ ...event, meta: event.meta ?? {} })));
      res.status(202).json({ accepted });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/health/connectors", async (_req, res) => {
    const connectorHealth = getActiveConnectorHealth(await params.store.getConnectorHealth());
    const byName = new Map(connectorHealth.map((c) => [c.connector, c]));
    const connectorStatuses = params.connectors.map((connector) => {
      const health = byName.get(connector.name());
      return {
        connector: connector.name(),
        last_success: health?.last_success ?? null,
        last_error: health?.last_error ?? null
      };
    });
    const alertHealth = byName.get("budget-alert");
    res.json({
      connectorHealth,
      connectors: params.connectors.map((c) => c.name()),
      subsystems: {
        connectors: connectorStatuses,
        budget_alert: {
          enabled: Boolean(params.alertingEnabled),
          last_success: alertHealth?.last_success ?? null,
          last_error: alertHealth?.last_error ?? null
        }
      }
    });
  });

  app.get("/api/export/cost-events", async (req, res) => {
    const parsedLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const events = await params.store.getCostEvents({
      vendor: typeof req.query.vendor === "string" ? req.query.vendor : undefined,
      metric: typeof req.query.metric === "string" ? req.query.metric : undefined,
      since: typeof req.query.since === "string" ? req.query.since : undefined,
      until: typeof req.query.until === "string" ? req.query.until : undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined
    });
    res.json({ events, count: events.length });
  });

  app.get("/", async (req, res) => {
    const now = params.now?.() ?? new Date();
    const showZeroDays =
      typeof req.query.showZeroDays === "string" && ["1", "true", "yes"].includes(req.query.showZeroDays.toLowerCase());
    const chart = normalizeChartMode(typeof req.query.chart === "string" ? req.query.chart.toLowerCase() : undefined);
    const summary = await params.store.getMtdSummary(now);
    const usageSummary = await params.store.getMtdUsageSummary(now);
    const forecast = forecastMonthEnd(now, summary.daily);
    const connectorHealth = getActiveConnectorHealth(await params.store.getConnectorHealth());
    const freeTierSummary = params.gcpFreeTierLimits
      ? await computeFreeTierStatus({ store: params.store, now, limits: params.gcpFreeTierLimits })
      : [];
    const window = monthWindow(now);
    const confidenceSummary = computeConfidenceSummary(
      await params.store.getCostEvents({ since: window.since, until: window.until, limit: 5000 })
    );
    res.type("html").send(
      renderDashboard({
        summary,
        usageSummary,
        freeTierSummary,
        confidenceSummary,
        forecast,
        connectorHealth,
        generatedAt: now.toISOString(),
        showZeroDays,
        chart
      })
    );
  });

  return app;
}
