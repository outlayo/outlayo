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
