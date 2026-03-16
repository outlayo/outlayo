import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface AnthropicUsageRow {
  id?: string;
  timestamp?: string | number;
  start_time?: string | number;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cost_usd?: number;
}

interface AnthropicUsageResponse {
  data?: AnthropicUsageRow[];
}

export interface AnthropicConnectorOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  pricingPer1k?: Record<string, number>;
}

const DEFAULT_PRICING_PER_1K: Record<string, number> = {
  "claude-3-5-sonnet": 0.003,
  unknown: 0.003
};

export class AnthropicConnector implements Connector {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly pricingPer1k: Record<string, number>;

  constructor(options: AnthropicConnectorOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.pricingPer1k = { ...DEFAULT_PRICING_PER_1K, ...(options.pricingPer1k ?? {}) };
  }

  name(): string {
    return "anthropic";
  }

  async healthcheck(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key is missing");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const payload = {
      start_time: Math.floor(since.getTime() / 1000),
      end_time: Math.floor(until.getTime() / 1000)
    };
    const response = await this.fetchImpl(`${this.baseUrl}/v1/organizations/usage_report/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Anthropic usage poll failed: ${response.status}`);
    }

    const json = (await response.json()) as AnthropicUsageResponse;
    const rows = json.data ?? [];
    return rows.map((row) => this.toCostEvent(row));
  }

  private toCostEvent(row: AnthropicUsageRow): CostEvent {
    const ts = this.parseTimestamp(row.timestamp ?? row.start_time);
    const inputTokens = Number(row.input_tokens ?? 0);
    const outputTokens = Number(row.output_tokens ?? 0);
    const cacheCreate = Number(row.cache_creation_input_tokens ?? 0);
    const cacheRead = Number(row.cache_read_input_tokens ?? 0);
    const quantity = Math.max(0, inputTokens + outputTokens + cacheCreate + cacheRead);
    const service = typeof row.model === "string" && row.model.trim() !== "" ? row.model : "unknown";
    const unit = this.pricingPer1k[service] ?? this.pricingPer1k.unknown;
    const computedCost = Number(((quantity / 1000) * unit).toFixed(8));
    const cost_usd = Number(row.cost_usd ?? computedCost);
    const source_ref =
      row.id ??
      crypto
        .createHash("sha256")
        .update(`${ts}|${service}|${inputTokens}|${outputTokens}|${cacheCreate}|${cacheRead}`)
        .digest("hex");

    return {
      ts,
      vendor: "anthropic",
      service,
      metric: "tokens",
      quantity,
      cost_usd,
      source_ref,
      meta: {
        estimated: row.cost_usd === undefined,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: cacheCreate,
        cache_read_input_tokens: cacheRead
      }
    };
  }

  private parseTimestamp(raw: string | number | undefined): string {
    if (typeof raw === "number") {
      const ms = raw >= 1_000_000_000_000 ? raw : raw * 1000;
      return new Date(ms).toISOString();
    }
    if (typeof raw === "string" && raw.trim() !== "") {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        const ms = numeric >= 1_000_000_000_000 ? numeric : numeric * 1000;
        return new Date(ms).toISOString();
      }
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    throw new Error("Anthropic usage row missing valid timestamp");
  }
}
