import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface Row {
  id?: string;
  ts?: string | number;
  service?: string;
  metric?: string;
  quantity?: number;
  cost_usd?: number;
}

interface Resp {
  data?: Row[];
}

export interface RenderConnectorOptions {
  apiKey: string;
  ownerId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class RenderConnector implements Connector {
  constructor(private readonly options: RenderConnectorOptions) {}

  name(): string {
    return "render";
  }

  async healthcheck(): Promise<void> {
    if (!this.options.apiKey || !this.options.ownerId) {
      throw new Error("Render connector misconfigured: missing API key or owner ID");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const baseUrl = this.options.baseUrl ?? "https://api.render.com";
    const params = new URLSearchParams({
      ownerId: this.options.ownerId,
      start: String(Math.floor(since.getTime() / 1000)),
      end: String(Math.floor(until.getTime() / 1000))
    });
    const response = await fetchImpl(`${baseUrl}/v1/usage?${params.toString()}`, {
      headers: { Authorization: `Bearer ${this.options.apiKey}` }
    });
    if (!response.ok) {
      throw new Error(`Render usage poll failed: ${response.status}`);
    }
    const json = (await response.json()) as Resp;
    return (json.data ?? []).map((row) => this.toEvent(row));
  }

  private toEvent(row: Row): CostEvent {
    const ts = new Date(row.ts ?? Date.now()).toISOString();
    const service = row.service?.trim() || "render";
    const metric = row.metric?.trim() || "usage";
    const quantity = Number(row.quantity ?? 0);
    const cost = Number(row.cost_usd ?? 0);
    return {
      ts,
      vendor: "render",
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
