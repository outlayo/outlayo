import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface MapboxUsageRow {
  timestamp?: string | number;
  service?: string;
  metric?: string;
  quantity?: number;
  id?: string;
}

interface MapboxUsageResponse {
  data?: MapboxUsageRow[];
  usage?: MapboxUsageRow[];
}

export interface MapboxPricingTier {
  upTo?: number;
  perUnitUsd: number;
}

export type MapboxPricingRule = number | MapboxPricingTier[];

export interface MapboxConnectorOptions {
  token: string;
  pricing: Record<string, MapboxPricingRule>;
  username: string;
  baseUrl?: string;
  usagePaths?: string[];
  fetchImpl?: typeof fetch;
}

export class MapboxConnector implements Connector {
  private readonly token: string;
  private readonly pricing: Record<string, MapboxPricingRule>;
  private readonly username: string;
  private readonly baseUrl: string;
  private readonly usagePaths: string[];
  private readonly fetchImpl: typeof fetch;

  constructor(options: MapboxConnectorOptions) {
    this.token = options.token;
    this.pricing = options.pricing;
    this.username = options.username;
    this.baseUrl = options.baseUrl ?? "https://api.mapbox.com";
    this.usagePaths =
      options.usagePaths ?? ["/usage/v1/{username}", "/accounts/v1/{username}/usage"];
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  name(): string {
    return "mapbox";
  }

  async healthcheck(): Promise<void> {
    if (!this.token) {
      throw new Error("Mapbox token is missing");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const usage = await this.fetchUsage(since, until);
    const rows = usage.data ?? usage.usage ?? [];
    return rows.map((row) => this.toCostEvent(row));
  }

  private async fetchUsage(since: Date, until: Date): Promise<MapboxUsageResponse> {
    const params = new URLSearchParams({
      access_token: this.token,
      start: Math.floor(since.getTime() / 1000).toString(),
      end: Math.floor(until.getTime() / 1000).toString()
    });

    const attempted: string[] = [];
    for (const rawPath of this.usagePaths) {
      const resolvedPath = rawPath.replace("{username}", encodeURIComponent(this.username));
      const url = `${this.baseUrl}${resolvedPath}?${params.toString()}`;
      attempted.push(url);
      const response = await this.fetchImpl(url);

      if (response.ok) {
        return (await response.json()) as MapboxUsageResponse;
      }

      if (response.status !== 404) {
        throw new Error(`Mapbox usage poll failed: ${response.status} (attempted ${url})`);
      }
    }

    throw new Error(
      `Mapbox usage poll failed: 404 (check MAPBOX_USERNAME, token/account access, and plan availability; attempted ${attempted.join(", ")})`
    );
  }

  private toCostEvent(row: MapboxUsageRow): CostEvent {
    const ts = this.parseTimestamp(row.timestamp);
    const service = row.service?.trim() || "mapbox";
    const metric = row.metric?.trim() || "requests";
    const quantity = Number(row.quantity ?? 0);
    const priceKey = `${service}.${metric}`;
    const pricingRule = this.pricing[priceKey] ?? this.pricing[metric] ?? 0;
    const { cost, unitPriceEstimate } = this.computeCost(quantity, pricingRule);
    const sourceSeed = `${ts}|${service}|${metric}|${quantity}`;
    const source_ref = row.id ?? crypto.createHash("sha256").update(sourceSeed).digest("hex");

    return {
      ts,
      vendor: "mapbox",
      service,
      metric,
      quantity,
      cost_usd: cost,
      source_ref,
      meta: {
        estimated: true,
        authoritative: false,
        unit_price_usd: unitPriceEstimate,
        pricing_key: this.pricing[priceKey] !== undefined ? priceKey : metric,
        pricing_rule: pricingRule
      }
    };
  }

  private computeCost(quantity: number, rule: MapboxPricingRule): { cost: number; unitPriceEstimate: number } {
    if (typeof rule === "number") {
      return {
        cost: Number((quantity * rule).toFixed(8)),
        unitPriceEstimate: rule
      };
    }

    if (!Array.isArray(rule) || rule.length === 0) {
      return { cost: 0, unitPriceEstimate: 0 };
    }

    const sorted = [...rule].sort((a, b) => (a.upTo ?? Number.POSITIVE_INFINITY) - (b.upTo ?? Number.POSITIVE_INFINITY));
    let remaining = Math.max(0, quantity);
    let previousBoundary = 0;
    let total = 0;

    for (const tier of sorted) {
      if (remaining <= 0) {
        break;
      }
      const boundary = tier.upTo ?? Number.POSITIVE_INFINITY;
      const tierWidth = Math.max(0, boundary - previousBoundary);
      const applied = Math.min(remaining, tierWidth === Number.POSITIVE_INFINITY ? remaining : tierWidth);
      total += applied * tier.perUnitUsd;
      remaining -= applied;
      previousBoundary = boundary;
    }

    const unitPriceEstimate = quantity > 0 ? total / quantity : sorted[0].perUnitUsd;
    return {
      cost: Number(total.toFixed(8)),
      unitPriceEstimate: Number(unitPriceEstimate.toFixed(8))
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
    return new Date().toISOString();
  }
}
