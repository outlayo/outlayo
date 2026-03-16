import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface Row {
  id?: string;
  timestamp?: string | number;
  service?: string;
  metric?: string;
  quantity?: number;
  cost_usd?: number;
}

interface Resp {
  data?: Row[];
}

export interface RailwayConnectorOptions {
  apiToken: string;
  projectId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class RailwayConnector implements Connector {
  constructor(private readonly options: RailwayConnectorOptions) {}

  name(): string {
    return "railway";
  }

  async healthcheck(): Promise<void> {
    if (!this.options.apiToken || !this.options.projectId) {
      throw new Error("Railway connector misconfigured: missing token or project ID");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const baseUrl = this.options.baseUrl ?? "https://backboard.railway.com/graphql";
    const query = {
      query:
        "query Usage($projectId:String!,$since:String!,$until:String!){usage(projectId:$projectId,since:$since,until:$until){id timestamp service metric quantity costUsd}}",
      variables: {
        projectId: this.options.projectId,
        since: since.toISOString(),
        until: until.toISOString()
      }
    };

    const response = await fetchImpl(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiToken}`
      },
      body: JSON.stringify(query)
    });
    if (!response.ok) {
      throw new Error(`Railway usage poll failed: ${response.status}`);
    }
    const json = (await response.json()) as { data?: { usage?: Array<{ id?: string; timestamp?: string; service?: string; metric?: string; quantity?: number; costUsd?: number }> } };
    const rows = json.data?.usage ?? [];
    return rows.map((row) => this.toEvent(row));
  }

  private toEvent(row: { id?: string; timestamp?: string; service?: string; metric?: string; quantity?: number; costUsd?: number }): CostEvent {
    const ts = new Date(row.timestamp ?? Date.now()).toISOString();
    const service = row.service?.trim() || "railway";
    const metric = row.metric?.trim() || "usage";
    const quantity = Number(row.quantity ?? 0);
    const cost = Number(row.costUsd ?? 0);
    return {
      ts,
      vendor: "railway",
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
