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
  data?: Row[];
  usage?: Row[];
}

export interface VercelConnectorOptions {
  token: string;
  teamId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class VercelConnector implements Connector {
  constructor(private readonly options: VercelConnectorOptions) {}

  name(): string {
    return "vercel";
  }

  async healthcheck(): Promise<void> {
    if (!this.options.token || !this.options.teamId) {
      throw new Error("Vercel connector misconfigured: missing token or team ID");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const baseUrl = this.options.baseUrl ?? "https://api.vercel.com";
    const params = new URLSearchParams({
      from: String(Math.floor(since.getTime() / 1000)),
      to: String(Math.floor(until.getTime() / 1000)),
      teamId: this.options.teamId
    });
    const response = await fetchImpl(`${baseUrl}/v1/usage?${params.toString()}`, {
      headers: { Authorization: `Bearer ${this.options.token}` }
    });
    if (!response.ok) {
      throw new Error(`Vercel usage poll failed: ${response.status}`);
    }
    const json = (await response.json()) as Resp;
    return (json.data ?? json.usage ?? []).map((row) => this.toEvent(row));
  }

  private toEvent(row: Row): CostEvent {
    const ts = new Date(row.timestamp ?? Date.now()).toISOString();
    const service = row.product?.trim() || "vercel";
    const metric = row.metric?.trim() || "usage";
    const quantity = Number(row.quantity ?? 0);
    const cost = Number(row.cost_usd ?? 0);
    return {
      ts,
      vendor: "vercel",
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
