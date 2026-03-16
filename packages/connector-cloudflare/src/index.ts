import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface Row {
  id?: string;
  timestamp?: string | number;
  product?: string;
  metric?: string;
  quantity?: number;
  cost_usd?: number;
}

interface Resp {
  result?: Row[];
}

interface CloudflareSubscriptionsResponse {
  result?: Array<{
    id?: string;
    current_period_start?: string;
    current_period_end?: string;
    currency?: string;
    price?: number | string;
    product?: { name?: string };
  }>;
}

export interface CloudflareConnectorOptions {
  apiToken: string;
  accountId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class CloudflareConnector implements Connector {
  constructor(private readonly options: CloudflareConnectorOptions) {}

  name(): string {
    return "cloudflare";
  }

  async healthcheck(): Promise<void> {
    if (!this.options.apiToken || !this.options.accountId) {
      throw new Error("Cloudflare connector misconfigured: missing token or account ID");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const baseUrl = this.options.baseUrl ?? "https://api.cloudflare.com/client/v4";
    const response = await fetchImpl(
      `${baseUrl}/accounts/${encodeURIComponent(this.options.accountId)}/subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${this.options.apiToken}`,
          "Content-Type": "application/json"
        }
      }
    );
    if (!response.ok) {
      throw new Error(`Cloudflare subscriptions poll failed: ${response.status}`);
    }
    const json = (await response.json()) as CloudflareSubscriptionsResponse;
    return (json.result ?? []).map((row) => this.toSubscriptionEvent(row));
  }

  private toSubscriptionEvent(row: {
    id?: string;
    current_period_start?: string;
    current_period_end?: string;
    currency?: string;
    price?: number | string;
    product?: { name?: string };
  }): CostEvent {
    const ts = new Date(row.current_period_start ?? Date.now()).toISOString();
    const service = row.product?.name?.trim() || "subscription";
    const cost = Number(row.price ?? 0);
    return {
      ts,
      vendor: "cloudflare",
      service,
      metric: "subscription_price",
      quantity: 1,
      cost_usd: Number.isFinite(cost) ? cost : 0,
      source_ref:
        row.id ??
        crypto
          .createHash("sha256")
          .update(`${ts}|${service}|${row.current_period_end ?? ""}|${row.currency ?? "USD"}|${cost}`)
          .digest("hex"),
      meta: {
        confidence: "authoritative",
        authoritative: true,
        estimated: false,
        reconciled: false,
        currency: row.currency ?? "USD",
        period_end: row.current_period_end ?? null
      }
    };
  }

  private toEvent(row: Row): CostEvent {
    const ts = new Date(row.timestamp ?? Date.now()).toISOString();
    const service = row.product?.trim() || "cloudflare";
    const metric = row.metric?.trim() || "usage";
    const quantity = Number(row.quantity ?? 0);
    const cost = Number(row.cost_usd ?? 0);
    return {
      ts,
      vendor: "cloudflare",
      service,
      metric,
      quantity,
      cost_usd: cost,
      source_ref:
        row.id ?? crypto.createHash("sha256").update(`${ts}|${service}|${metric}|${quantity}|${cost}`).digest("hex"),
      meta: {
        confidence: cost > 0 ? "authoritative" : "estimated",
        authoritative: cost > 0,
        estimated: cost <= 0,
        reconciled: false
      }
    };
  }
}
