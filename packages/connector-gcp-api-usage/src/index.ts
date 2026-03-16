import crypto from "node:crypto";
import fs from "node:fs";
import { BigQuery } from "@google-cloud/bigquery";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface BigQueryLike {
  query(options: { query: string; params: Record<string, unknown> }): Promise<[Record<string, unknown>[]]>;
}

interface UsageRow {
  service?: string;
  usage_start_time?: string;
  usage_amount?: number;
}

export interface GcpApiUsageConnectorOptions {
  projectId: string;
  dataset: string;
  table: string;
  serviceAccountJson?: string | null;
  serviceAccountFile?: string | null;
  queryClient?: BigQueryLike;
}

export class GcpApiUsageConnector implements Connector {
  private readonly projectId: string;
  private readonly dataset: string;
  private readonly table: string;
  private readonly queryClient: BigQueryLike;

  constructor(options: GcpApiUsageConnectorOptions) {
    this.projectId = options.projectId;
    this.dataset = options.dataset;
    this.table = options.table;
    this.queryClient = options.queryClient ?? this.buildClient(options);
  }

  name(): string {
    return "gcp-api-usage";
  }

  async healthcheck(): Promise<void> {
    if (!this.projectId || !this.dataset || !this.table) {
      throw new Error("GCP API usage connector misconfigured");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const query = `
      SELECT
        service.description AS service,
        usage_start_time,
        usage.amount AS usage_amount
      FROM \`${this.projectId}.${this.dataset}.${this.table}\`
      WHERE usage_start_time >= @since
        AND usage_start_time < @until
        AND (
          LOWER(service.description) LIKE '%places%'
          OR LOWER(service.description) LIKE '%geocoding%'
        )
    `;

    const [rows] = await this.queryClient.query({
      query,
      params: { since: since.toISOString(), until: until.toISOString() }
    });

    return rows.map((row) => this.toEvent(row as UsageRow));
  }

  private buildClient(options: GcpApiUsageConnectorOptions): BigQueryLike {
    let credentials: Record<string, unknown> | undefined;
    if (options.serviceAccountJson) {
      credentials = JSON.parse(options.serviceAccountJson);
    } else if (options.serviceAccountFile) {
      credentials = JSON.parse(fs.readFileSync(options.serviceAccountFile, "utf8"));
    }

    return new BigQuery({
      projectId: options.projectId,
      ...(credentials ? { credentials } : {})
    });
  }

  private toEvent(row: UsageRow): CostEvent {
    const rawService = (row.service ?? "unknown").toLowerCase();
    const service = rawService.includes("geocoding") ? "geocoding-api" : rawService.includes("places") ? "places-api" : "unknown-api";
    const ts = new Date(row.usage_start_time ?? new Date().toISOString()).toISOString();
    const quantity = Number(row.usage_amount ?? 0);
    const source_ref = crypto
      .createHash("sha256")
      .update(`${service}|${ts}|${quantity}`)
      .digest("hex");

    return {
      ts,
      vendor: "gcp",
      service,
      metric: "requests",
      quantity,
      cost_usd: 0,
      source_ref,
      meta: {
        usage_only: true,
        estimated: false,
        source: "gcp_billing_export_usage_amount"
      }
    };
  }
}
