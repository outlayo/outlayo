import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface UsageRow {
  timestamp?: string | number;
  start_time?: string | number;
  end_time?: string | number;
  model?: string;
  model_name?: string;
  snapshot_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  input_cached_tokens?: number;
  cost_usd?: number;
  id?: string;
  results?: UsageRow[];
}

interface UsageResponse {
  data: UsageRow[];
}

export interface OpenAIConnectorOptions {
  apiKey: string;
  project: string | null;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  pricing?: Record<string, number>;
}

const DEFAULT_PRICING_PER_1K: Record<string, number> = {
  "gpt-4o-mini": 0.0006,
  unknown: 0.001
};

export class OpenAIConnector implements Connector {
  private readonly apiKey: string;
  private readonly project: string | null;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly pricing: Record<string, number>;

  constructor(options: OpenAIConnectorOptions) {
    this.apiKey = options.apiKey;
    this.project = options.project;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.pricing = { ...DEFAULT_PRICING_PER_1K, ...(options.pricing ?? {}) };
  }

  name(): string {
    return "openai";
  }

  async healthcheck(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is missing");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const usage = await this.fetchUsage(since, until);
    const rows = usage.data.flatMap((row) => (Array.isArray(row.results) && row.results.length > 0 ? row.results.map((r) => ({ ...r, start_time: r.start_time ?? row.start_time, end_time: r.end_time ?? row.end_time })) : [row]));
    return rows.map((row) => this.toCostEvent(row));
  }

  private async fetchUsage(since: Date, until: Date): Promise<UsageResponse> {
    const params = new URLSearchParams({
      start_time: Math.floor(since.getTime() / 1000).toString(),
      end_time: Math.floor(until.getTime() / 1000).toString()
    });

    const response = await this.fetchImpl(`${this.baseUrl}/v1/organization/usage/completions?${params}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(this.project ? { "OpenAI-Project": this.project } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI usage poll failed: ${response.status}`);
    }

    return (await response.json()) as UsageResponse;
  }

  private toCostEvent(row: UsageRow): CostEvent {
    const eventTimestamp = this.parseUsageTimestamp(row);
    const inputTokens = Number(row.input_tokens ?? 0);
    const outputTokens = Number(row.output_tokens ?? 0);
    const cachedTokens = Number(row.input_cached_tokens ?? 0);
    const totalTokens = Math.max(0, inputTokens + outputTokens + cachedTokens);
    const service = this.resolveService(row);
    const pricing = this.pricing[service] ?? this.pricing.unknown;
    const computedCost = Number(((totalTokens / 1000) * pricing).toFixed(8));
    const cost = row.cost_usd ?? computedCost;

    const sourceSeed = `${eventTimestamp}|${service}|${inputTokens}|${outputTokens}|${cachedTokens}`;
    const source_ref = row.id ?? crypto.createHash("sha256").update(sourceSeed).digest("hex");

    return {
      ts: eventTimestamp,
      vendor: "openai",
      service,
      metric: "tokens",
      quantity: totalTokens,
      cost_usd: cost,
      source_ref,
      meta: {
        estimated: row.cost_usd === undefined,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_cached_tokens: cachedTokens
      }
    };
  }

  private resolveService(row: UsageRow): string {
    const candidate = row.model ?? row.model_name ?? row.snapshot_id;
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate;
    }
    return "unknown";
  }

  private parseUsageTimestamp(row: UsageRow): string {
    const raw = row.timestamp ?? row.start_time;

    if (typeof raw === "number") {
      const millis = raw >= 1_000_000_000_000 ? raw : raw * 1000;
      return new Date(millis).toISOString();
    }

    if (typeof raw === "string") {
      const numeric = Number(raw);
      if (Number.isFinite(numeric) && raw.trim() !== "") {
        const millis = numeric >= 1_000_000_000_000 ? numeric : numeric * 1000;
        return new Date(millis).toISOString();
      }

      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    throw new Error("OpenAI usage row missing valid timestamp/start_time");
  }
}
