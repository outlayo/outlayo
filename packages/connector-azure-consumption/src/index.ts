import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface AzureUsageDetailsResponse {
  value?: AzureUsageRow[];
}

interface AzureUsageRow {
  id?: string;
  properties?: {
    usageStart?: string;
    usageEnd?: string;
    meterCategory?: string;
    meterName?: string;
    quantity?: number;
    costInBillingCurrency?: number;
    billingCurrencyCode?: string;
  };
}

export interface AzureConsumptionConnectorOptions {
  subscriptionId: string;
  bearerToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class AzureConsumptionConnector implements Connector {
  private readonly subscriptionId: string;
  private readonly bearerToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AzureConsumptionConnectorOptions) {
    this.subscriptionId = options.subscriptionId;
    this.bearerToken = options.bearerToken;
    this.baseUrl = options.baseUrl ?? "https://management.azure.com";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  name(): string {
    return "azure-consumption";
  }

  async healthcheck(): Promise<void> {
    if (!this.subscriptionId || !this.bearerToken) {
      throw new Error("Azure consumption connector misconfigured: missing subscription ID or bearer token");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const filter = encodeURIComponent(
      `properties/usageEnd ge '${this.toAzureDate(since)}' and properties/usageEnd lt '${this.toAzureDate(until)}'`
    );
    const url =
      `${this.baseUrl}/subscriptions/${this.subscriptionId}` +
      `/providers/Microsoft.Consumption/usageDetails?api-version=2023-03-01&$filter=${filter}`;
    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Azure consumption poll failed: ${response.status}`);
    }

    const json = (await response.json()) as AzureUsageDetailsResponse;
    return (json.value ?? []).map((row) => this.toCostEvent(row));
  }

  private toCostEvent(row: AzureUsageRow): CostEvent {
    const props = row.properties ?? {};
    const ts = new Date(props.usageStart ?? new Date().toISOString()).toISOString();
    const service = props.meterCategory ?? "unknown-service";
    const metric = props.meterName ?? "usage";
    const quantity = Number(props.quantity ?? 0);
    const cost_usd = Number(props.costInBillingCurrency ?? 0);
    const source_ref =
      row.id ??
      crypto
        .createHash("sha256")
        .update(`${ts}|${service}|${metric}|${quantity}|${cost_usd}`)
        .digest("hex");

    return {
      ts,
      vendor: "azure",
      service,
      metric,
      quantity,
      cost_usd,
      source_ref,
      meta: {
        authoritative: true,
        estimated: false,
        currency: props.billingCurrencyCode ?? "USD",
        usage_end: props.usageEnd ?? null
      }
    };
  }

  private toAzureDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
