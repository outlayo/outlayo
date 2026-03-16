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
