import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface UsageRow {
  id?: string;
  timestamp?: string | number;
  service?: string;
  metric?: string;
  quantity?: number;
  cost_usd?: number;
  confidence?: "authoritative" | "estimated" | "reconciled";
}

interface UsageResponse {
  data?: UsageRow[];
  usage?: UsageRow[];
  results?: UsageRow[];
}

interface SupabaseProjectResponse {
  id?: string;
  ref?: string;
  organization_id?: string;
  name?: string;
  created_at?: string;
}

interface SupabaseOrganizationResponse {
  id?: string;
  plan?: string;
}

export interface SupabaseConnectorOptions {
  projectRef: string;
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class SupabaseConnector implements Connector {
  private readonly projectRef: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SupabaseConnectorOptions) {
    this.projectRef = options.projectRef;
    this.accessToken = options.accessToken;
    this.baseUrl = options.baseUrl ?? "https://api.supabase.com";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  name(): string {
    return "supabase";
  }

  async healthcheck(): Promise<void> {
    if (!this.projectRef || !this.accessToken) {
      throw new Error("Supabase connector misconfigured: missing project ref or token");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const params = new URLSearchParams({
      start: Math.floor(since.getTime() / 1000).toString(),
      end: Math.floor(until.getTime() / 1000).toString()
    });
    const response = await this.fetchImpl(
      `${this.baseUrl}/v1/projects/${encodeURIComponent(this.projectRef)}/usage?${params.toString()}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    if (response.ok) {
      const json = (await response.json()) as UsageResponse;
      const rows = json.data ?? json.usage ?? json.results ?? [];
      return rows.map((row) => this.toEvent(row));
    }

    if (response.status === 404) {
      return this.pollProjectPlanFallback();
    }

    throw new Error(`Supabase usage poll failed: ${response.status}`);
  }

  private async pollProjectPlanFallback(): Promise<CostEvent[]> {
    const headers = { Authorization: `Bearer ${this.accessToken}` };
    const projectResponse = await this.fetchImpl(
      `${this.baseUrl}/v1/projects/${encodeURIComponent(this.projectRef)}`,
      { headers }
    );
    if (!projectResponse.ok) {
      throw new Error(`Supabase project fallback failed: ${projectResponse.status}`);
    }
    const project = (await projectResponse.json()) as SupabaseProjectResponse;
    let plan = "unknown";
    if (project.organization_id) {
      const organizationResponse = await this.fetchImpl(
        `${this.baseUrl}/v1/organizations/${encodeURIComponent(project.organization_id)}`,
        { headers }
      );
      if (organizationResponse.ok) {
        const organization = (await organizationResponse.json()) as SupabaseOrganizationResponse;
        if (organization.plan) {
          plan = organization.plan;
        }
      }
    }

    const ts = new Date(project.created_at ?? Date.now()).toISOString();
    const source_ref = crypto.createHash("sha256").update(`${project.ref ?? this.projectRef}|${plan}`).digest("hex");

    return [
      {
        ts,
        vendor: "supabase",
        service: project.name?.trim() || "supabase-project",
        metric: "plan_status",
        quantity: 1,
        cost_usd: 0,
        source_ref,
        meta: {
          confidence: "estimated",
          authoritative: false,
          estimated: true,
          reconciled: false,
          fallback: true,
          plan
        }
      }
    ];
  }

  private toEvent(row: UsageRow): CostEvent {
    const ts = this.parseTs(row.timestamp);
    const service = row.service?.trim() || "supabase";
    const metric = row.metric?.trim() || "requests";
    const quantity = Number(row.quantity ?? 0);
    const cost = Number(row.cost_usd ?? 0);
    const confidence = row.confidence ?? (cost > 0 ? "authoritative" : "estimated");
    const source_ref =
      row.id ?? crypto.createHash("sha256").update(`${ts}|${service}|${metric}|${quantity}|${cost}`).digest("hex");

    return {
      ts,
      vendor: "supabase",
      service,
      metric,
      quantity,
      cost_usd: cost,
      source_ref,
      meta: {
        confidence,
        authoritative: confidence === "authoritative",
        estimated: confidence !== "authoritative",
        reconciled: confidence === "reconciled"
      }
    };
  }

  private parseTs(raw: string | number | undefined): string {
    if (typeof raw === "number") {
      return new Date(raw >= 1_000_000_000_000 ? raw : raw * 1000).toISOString();
    }
    if (typeof raw === "string" && raw.trim() !== "") {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        return new Date(numeric >= 1_000_000_000_000 ? numeric : numeric * 1000).toISOString();
      }
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return new Date().toISOString();
  }
}
