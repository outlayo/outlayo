import pg from "pg";
import type {
  ConnectorHealth,
  ConnectorRunInput,
  CostEvent,
  CostEventQuery,
  DailySpend,
  SpendSummary,
  Store,
  UsageSummaryRow,
  VendorSpend
} from "@outlayo/core";

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS cost_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  vendor TEXT NOT NULL,
  service TEXT NOT NULL,
  metric TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  cost_usd DOUBLE PRECISION NOT NULL,
  source_ref TEXT NOT NULL,
  meta JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor, source_ref)
);
CREATE INDEX IF NOT EXISTS idx_cost_events_ts ON cost_events(ts);
CREATE INDEX IF NOT EXISTS idx_cost_events_vendor_ts ON cost_events(vendor, ts);

CREATE TABLE IF NOT EXISTS connector_runs (
  id BIGSERIAL PRIMARY KEY,
  connector TEXT NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_connector_runs_connector_ran_at ON connector_runs(connector, ran_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
`;

export class PostgresStore implements Store {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async migrate(): Promise<void> {
    try {
      await this.pool.query("SELECT 1");
      await this.pool.query(PG_SCHEMA);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Postgres readiness check failed. Verify POSTGRES_URL/network/credentials. Details: ${message}`);
    }
  }

  async upsertCostEvents(events: CostEvent[]): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const event of events) {
        if (!event.ts || !event.vendor || !event.service || !event.metric || !event.source_ref) {
          throw new Error("Invalid cost event: missing required fields");
        }
        await client.query(
          `
          INSERT INTO cost_events (ts, vendor, service, metric, quantity, cost_usd, source_ref, meta)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT(vendor, source_ref) DO UPDATE
          SET ts=EXCLUDED.ts,
              service=EXCLUDED.service,
              metric=EXCLUDED.metric,
              quantity=EXCLUDED.quantity,
              cost_usd=EXCLUDED.cost_usd,
              meta=EXCLUDED.meta
        `,
          [
            event.ts,
            event.vendor,
            event.service,
            event.metric,
            event.quantity,
            event.cost_usd,
            event.source_ref,
            event.meta
          ]
        );
      }
      await client.query("COMMIT");
      return events.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordConnectorRun(run: ConnectorRunInput): Promise<void> {
    await this.pool.query(
      "INSERT INTO connector_runs (connector, ran_at, success, error) VALUES ($1, $2, $3, $4)",
      [run.connector, run.ran_at, run.success, run.error]
    );
  }

  async getConnectorHealth(): Promise<ConnectorHealth[]> {
    const { rows } = await this.pool.query(
      `
      SELECT c.connector,
             MAX(CASE WHEN c.success THEN c.ran_at ELSE NULL END)::text AS last_success,
             (
               SELECT cr.error
               FROM connector_runs cr
               WHERE cr.connector = c.connector
               ORDER BY cr.ran_at DESC
               LIMIT 1
             ) AS last_error
      FROM connector_runs c
      GROUP BY c.connector
    `
    );
    return rows as ConnectorHealth[];
  }

  async getMtdSummary(now: Date): Promise<SpendSummary> {
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const end = now.toISOString();

    const totalRow = await this.pool.query(
      "SELECT COALESCE(SUM(cost_usd), 0) as total FROM cost_events WHERE ts >= $1 AND ts <= $2",
      [firstOfMonth, end]
    );

    const vendorRows = await this.pool.query(
      "SELECT vendor, COALESCE(SUM(cost_usd), 0) as spend_usd FROM cost_events WHERE ts >= $1 AND ts <= $2 GROUP BY vendor ORDER BY vendor",
      [firstOfMonth, end]
    );

    const dailyRows = await this.pool.query(
      "SELECT to_char(ts at time zone 'UTC', 'YYYY-MM-DD') as date, vendor, COALESCE(SUM(cost_usd), 0) as spend_usd FROM cost_events WHERE ts >= $1 AND ts <= $2 GROUP BY date, vendor ORDER BY date, vendor",
      [firstOfMonth, end]
    );

    return {
      mtd_total_usd: Number(totalRow.rows[0]?.total ?? 0),
      by_vendor: (vendorRows.rows as VendorSpend[]).map((v) => ({
        ...v,
        spend_usd: Number(v.spend_usd)
      })),
      daily: (dailyRows.rows as DailySpend[]).map((d) => ({ ...d, spend_usd: Number(d.spend_usd) }))
    };
  }

  async getMtdUsageSummary(now: Date): Promise<UsageSummaryRow[]> {
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const end = now.toISOString();

    const rows = await this.pool.query(
      "SELECT vendor, metric, COALESCE(SUM(quantity), 0) as quantity FROM cost_events WHERE ts >= $1 AND ts <= $2 GROUP BY vendor, metric ORDER BY vendor, metric",
      [firstOfMonth, end]
    );

    return (rows.rows as UsageSummaryRow[]).map((row) => ({
      ...row,
      quantity: Number(row.quantity)
    }));
  }

  async getCostEvents(query: CostEventQuery): Promise<CostEvent[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (query.vendor) {
      clauses.push(`vendor = $${idx++}`);
      values.push(query.vendor);
    }
    if (query.metric) {
      clauses.push(`metric = $${idx++}`);
      values.push(query.metric);
    }
    if (query.since) {
      clauses.push(`ts >= $${idx++}`);
      values.push(query.since);
    }
    if (query.until) {
      clauses.push(`ts <= $${idx++}`);
      values.push(query.until);
    }
    const limit = Math.max(1, Math.min(5000, query.limit ?? 500));

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const sql = `SELECT ts::text, vendor, service, metric, quantity, cost_usd, source_ref, meta FROM cost_events ${where} ORDER BY ts DESC LIMIT ${limit}`;
    const rows = await this.pool.query(sql, values);

    return rows.rows.map((row) => ({
      ts: String(row.ts),
      vendor: String(row.vendor),
      service: String(row.service),
      metric: String(row.metric),
      quantity: Number(row.quantity),
      cost_usd: Number(row.cost_usd),
      source_ref: String(row.source_ref),
      meta: (row.meta ?? {}) as Record<string, unknown>
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
