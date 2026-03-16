export type Vendor = "openai" | "anthropic" | "gcp" | "aws" | "azure" | (string & {});

export interface CostEvent {
  ts: string;
  vendor: Vendor;
  service: string;
  metric: string;
  quantity: number;
  cost_usd: number;
  source_ref: string;
  meta: Record<string, unknown>;
}

export interface ConnectorRunInput {
  connector: string;
  ran_at: string;
  success: boolean;
  error: string | null;
}

export interface ConnectorHealth {
  connector: string;
  last_success: string | null;
  last_error: string | null;
}

export interface DailySpend {
  date: string;
  vendor: string;
  spend_usd: number;
}

export interface VendorSpend {
  vendor: string;
  spend_usd: number;
}

export interface SpendSummary {
  mtd_total_usd: number;
  by_vendor: VendorSpend[];
  daily: DailySpend[];
}

export interface UsageSummaryRow {
  vendor: string;
  metric: string;
  quantity: number;
}

export type ConfidenceLabel = "authoritative" | "estimated" | "reconciled";

export interface ConfidenceSummary {
  by_confidence: Array<{
    confidence: ConfidenceLabel;
    event_count: number;
    cost_usd: number;
  }>;
}

export interface IngestEventInput {
  ts: string;
  vendor: string;
  service: string;
  metric: string;
  quantity: number;
  cost_usd: number;
  source_ref: string;
  confidence?: ConfidenceLabel;
  meta?: Record<string, unknown>;
}

export interface IngestBatchInput {
  events: IngestEventInput[];
}

export interface CostEventQuery {
  vendor?: string;
  metric?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface Store {
  migrate(): Promise<void>;
  upsertCostEvents(events: CostEvent[]): Promise<number>;
  recordConnectorRun(run: ConnectorRunInput): Promise<void>;
  getConnectorHealth(): Promise<ConnectorHealth[]>;
  getMtdSummary(now: Date): Promise<SpendSummary>;
  getMtdUsageSummary(now: Date): Promise<UsageSummaryRow[]>;
  getCostEvents(query: CostEventQuery): Promise<CostEvent[]>;
  close(): Promise<void>;
}

export interface ConnectorContext {
  now: () => Date;
}

export interface Connector {
  name(): string;
  poll(since: Date, until: Date, ctx: ConnectorContext): Promise<CostEvent[]>;
  healthcheck?(): Promise<void>;
}

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  adminToken: string | null;
  adminHeaderName: string;
  pollIntervalMinutes: number;
  dbBackend: "sqlite" | "postgres";
  sqlitePath: string;
  postgresUrl: string | null;
  openaiApiKey: string | null;
  openaiProject: string | null;
  openaiEnabled: boolean;
  anthropicEnabled: boolean;
  anthropicApiKey: string | null;
  anthropicBaseUrl: string | null;
  gcpEnabled: boolean;
  gcpProjectId: string | null;
  gcpBillingDataset: string | null;
  gcpBillingTable: string | null;
  gcpServiceAccountJson: string | null;
  gcpServiceAccountFile: string | null;
  gcpApiUsageEnabled: boolean;
  gcpFreeTierLimitsJson: string | null;
  mapboxEnabled: boolean;
  mapboxToken: string | null;
  mapboxUsername: string | null;
  mapboxPricingJson: string | null;
  mapboxBaseUrl: string | null;
  supabaseEnabled: boolean;
  supabaseProjectRef: string | null;
  supabaseAccessToken: string | null;
  supabaseBaseUrl: string | null;
  vercelEnabled: boolean;
  vercelToken: string | null;
  vercelTeamId: string | null;
  vercelBaseUrl: string | null;
  renderEnabled: boolean;
  renderApiKey: string | null;
  renderOwnerId: string | null;
  renderBaseUrl: string | null;
  railwayEnabled: boolean;
  railwayApiToken: string | null;
  railwayProjectId: string | null;
  railwayBaseUrl: string | null;
  cloudflareEnabled: boolean;
  cloudflareApiToken: string | null;
  cloudflareAccountId: string | null;
  cloudflareBaseUrl: string | null;
  awsCostExplorerEnabled: boolean;
  awsAccessKeyId: string | null;
  awsSecretAccessKey: string | null;
  awsSessionToken: string | null;
  awsRegion: string;
  awsCostExplorerEndpoint: string | null;
  azureConsumptionEnabled: boolean;
  azureSubscriptionId: string | null;
  azureBearerToken: string | null;
  azureConsumptionBaseUrl: string | null;
  monthlyBudgetUsd: number | null;
  alertWebhookUrl: string | null;
  alertCooldownHours: number;
}
