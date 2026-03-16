import crypto from "node:crypto";
import fs from "node:fs";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";
import { BigQuery } from "@google-cloud/bigquery";

interface BigQueryLike {
  query(options: { query: string; params: Record<string, unknown> }): Promise<[Record<string, unknown>[]]>;
}

interface BillingRow {
  invoice_month?: string;
  project_id?: string;
  service_description?: string;
  sku_description?: string;
  usage_start_time?: string;
  usage_end_time?: string;
  usage_amount?: number;
  cost?: number;
  currency?: string;
}

export interface GcpBillingConnectorOptions {
  projectId: string;
  dataset: string;
  table: string;
  serviceAccountJson?: string | null;
  serviceAccountFile?: string | null;
  queryClient?: BigQueryLike;
}

export class GcpBillingConnector implements Connector {
  private readonly projectId: string;
  private readonly dataset: string;
  private readonly table: string;
  private readonly queryClient: BigQueryLike;

  constructor(options: GcpBillingConnectorOptions) {
    this.projectId = options.projectId;
    this.dataset = options.dataset;
    this.table = options.table;
    this.queryClient = options.queryClient ?? this.buildBigQueryClient(options);
  }

  name(): string {
    return "gcp-billing";
  }

  async healthcheck(): Promise<void> {
    if (!this.projectId || !this.dataset || !this.table) {
      throw new Error("GCP billing connector misconfigured: missing project/dataset/table");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const query = `
      SELECT
        invoice.month AS invoice_month,
        project.id AS project_id,
        service.description AS service_description,
        sku.description AS sku_description,
        usage_start_time,
        usage_end_time,
        usage.amount AS usage_amount,
        cost,
        currency
      FROM \`${this.projectId}.${this.dataset}.${this.table}\`
      WHERE usage_start_time >= @since AND usage_start_time < @until
    `;

    const [rows] = await this.queryClient.query({
      query,
      params: {
        since: since.toISOString(),
        until: until.toISOString()
      }
    });

    return rows.map((row) => this.toCostEvent(row as BillingRow));
  }

  private buildBigQueryClient(options: GcpBillingConnectorOptions): BigQueryLike {
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

  private toCostEvent(row: BillingRow): CostEvent {
    const ts = new Date(row.usage_start_time ?? new Date().toISOString()).toISOString();
    const service = row.service_description || "unknown-service";
    const sku = row.sku_description || "unknown-sku";
    const projectId = row.project_id || "unknown-project";
    const invoiceMonth = row.invoice_month || "unknown-month";
    const usageAmount = Number(row.usage_amount ?? 0);
    const cost = Number(row.cost ?? 0);

    const sourceSeed = [
      invoiceMonth,
      projectId,
      service,
      sku,
      row.usage_start_time ?? "",
      row.usage_end_time ?? "",
      usageAmount,
      cost
    ].join("|");
    const source_ref = crypto.createHash("sha256").update(sourceSeed).digest("hex");

    return {
      ts,
      vendor: "gcp",
      service,
      metric: "sku_cost",
      quantity: usageAmount,
      cost_usd: cost,
      source_ref,
      meta: {
        authoritative: true,
        estimated: false,
        sku,
        project_id: projectId,
        invoice_month: invoiceMonth,
        usage_end_time: row.usage_end_time ?? null,
        currency: row.currency ?? "USD"
      }
    };
  }
}
