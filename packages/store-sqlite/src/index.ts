import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
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

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS cost_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  vendor TEXT NOT NULL,
  service TEXT NOT NULL,
  metric TEXT NOT NULL,
  quantity REAL NOT NULL,
  cost_usd REAL NOT NULL,
  source_ref TEXT NOT NULL,
  meta TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(vendor, source_ref)
);
CREATE INDEX IF NOT EXISTS idx_cost_events_ts ON cost_events(ts);
CREATE INDEX IF NOT EXISTS idx_cost_events_vendor_ts ON cost_events(vendor, ts);

CREATE TABLE IF NOT EXISTS connector_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector TEXT NOT NULL,
  ran_at TEXT NOT NULL,
  success INTEGER NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_connector_runs_connector_ran_at ON connector_runs(connector, ran_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export class SQLiteStore implements Store {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath === ":memory:" ? dbPath : path.resolve(dbPath);
    if (this.dbPath !== ":memory:") {
      this.ensureWritablePath();
    }
    this.db = new Database(this.dbPath);
  }

  async migrate(): Promise<void> {
    this.db.exec(SQLITE_SCHEMA);
  }

  async upsertCostEvents(events: CostEvent[]): Promise<number> {
    if (events.length === 0) {
      return 0;
    }

    const insert = this.db.prepare(`
      INSERT INTO cost_events (ts, vendor, service, metric, quantity, cost_usd, source_ref, meta)
      VALUES (@ts, @vendor, @service, @metric, @quantity, @cost_usd, @source_ref, @meta)
      ON CONFLICT(vendor, source_ref) DO UPDATE SET
        ts=excluded.ts,
        service=excluded.service,
        metric=excluded.metric,
        quantity=excluded.quantity,
        cost_usd=excluded.cost_usd,
        meta=excluded.meta
    `);

    const tx = this.db.transaction((rows: CostEvent[]) => {
      for (const event of rows) {
        if (!event.ts || !event.vendor || !event.service || !event.metric || !event.source_ref) {
          throw new Error("Invalid cost event: missing required fields");
        }
        insert.run({
          ...event,
          meta: JSON.stringify(event.meta ?? {})
        });
      }
    });

    tx(events);
    return events.length;
  }

  async recordConnectorRun(run: ConnectorRunInput): Promise<void> {
    this.db
      .prepare("INSERT INTO connector_runs (connector, ran_at, success, error) VALUES (?, ?, ?, ?)")
      .run(run.connector, run.ran_at, run.success ? 1 : 0, run.error);
  }

  async getConnectorHealth(): Promise<ConnectorHealth[]> {
    const rows = this.db
      .prepare(
        `
        SELECT c.connector,
               MAX(CASE WHEN c.success = 1 THEN c.ran_at ELSE NULL END) as last_success,
               (
                 SELECT cr.error
                 FROM connector_runs cr
                 WHERE cr.connector = c.connector
                 ORDER BY cr.ran_at DESC
                 LIMIT 1
               ) as last_error
        FROM connector_runs c
        GROUP BY c.connector
      `
      )
      .all() as ConnectorHealth[];
    return rows;
  }

  async getMtdSummary(now: Date): Promise<SpendSummary> {
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const end = now.toISOString();

    const totalRow = this.db
      .prepare("SELECT COALESCE(SUM(cost_usd), 0) as total FROM cost_events WHERE ts >= ? AND ts <= ?")
      .get(firstOfMonth, end) as { total: number };

    const byVendor = this.db
      .prepare(
        "SELECT vendor, COALESCE(SUM(cost_usd), 0) as spend_usd FROM cost_events WHERE ts >= ? AND ts <= ? GROUP BY vendor ORDER BY vendor"
      )
      .all(firstOfMonth, end) as VendorSpend[];

    const daily = this.db
      .prepare(
        "SELECT substr(ts, 1, 10) as date, vendor, COALESCE(SUM(cost_usd), 0) as spend_usd FROM cost_events WHERE ts >= ? AND ts <= ? GROUP BY date, vendor ORDER BY date, vendor"
      )
      .all(firstOfMonth, end) as DailySpend[];

    return {
      mtd_total_usd: Number((totalRow?.total ?? 0).toFixed(2)),
      by_vendor: byVendor.map((v) => ({ ...v, spend_usd: Number(v.spend_usd.toFixed(2)) })),
      daily: daily.map((d) => ({ ...d, spend_usd: Number(d.spend_usd.toFixed(2)) }))
    };
  }

  async getMtdUsageSummary(now: Date): Promise<UsageSummaryRow[]> {
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const end = now.toISOString();

    const rows = this.db
      .prepare(
        "SELECT vendor, metric, COALESCE(SUM(quantity), 0) as quantity FROM cost_events WHERE ts >= ? AND ts <= ? GROUP BY vendor, metric ORDER BY vendor, metric"
      )
      .all(firstOfMonth, end) as UsageSummaryRow[];

    return rows.map((row) => ({ ...row, quantity: Number(row.quantity.toFixed(4)) }));
  }

  async getCostEvents(query: CostEventQuery): Promise<CostEvent[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];

    if (query.vendor) {
      clauses.push("vendor = ?");
      values.push(query.vendor);
    }
    if (query.metric) {
      clauses.push("metric = ?");
      values.push(query.metric);
    }
    if (query.since) {
      clauses.push("ts >= ?");
      values.push(query.since);
    }
    if (query.until) {
      clauses.push("ts <= ?");
      values.push(query.until);
    }

    const limit = Math.max(1, Math.min(5000, query.limit ?? 500));
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const sql = `SELECT ts, vendor, service, metric, quantity, cost_usd, source_ref, meta FROM cost_events ${where} ORDER BY ts DESC LIMIT ${limit}`;
    const rows = this.db.prepare(sql).all(...values) as Array<
      Omit<CostEvent, "meta"> & { meta: string | Record<string, unknown> }
    >;

    return rows.map((row) => ({
      ...row,
      meta: typeof row.meta === "string" ? JSON.parse(row.meta) : row.meta
    }));
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private ensureWritablePath(): void {
    const dir = path.dirname(this.dbPath);
    fs.mkdirSync(dir, { recursive: true });

    try {
      fs.accessSync(dir, fs.constants.W_OK);
    } catch {
      throw new Error(`SQLite directory is not writable: ${dir}`);
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        fs.accessSync(this.dbPath, fs.constants.W_OK);
      } catch {
        throw new Error(`SQLite database file is read-only: ${this.dbPath}`);
      }
    }
  }
}
