import crypto from "node:crypto";
import type { Connector, ConnectorContext, CostEvent } from "@outlayo/core";

interface AwsMetricAmount {
  Amount?: string;
  Unit?: string;
}

interface AwsGroup {
  Keys?: string[];
  Metrics?: {
    UnblendedCost?: AwsMetricAmount;
    UsageQuantity?: AwsMetricAmount;
  };
}

interface AwsTimeBucket {
  TimePeriod?: { Start?: string; End?: string };
  Groups?: AwsGroup[];
}

interface AwsCostExplorerResponse {
  ResultsByTime?: AwsTimeBucket[];
}

export interface AwsCostExplorerConnectorOptions {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string | null;
  region: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export class AwsCostExplorerConnector implements Connector {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly sessionToken: string | null;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AwsCostExplorerConnectorOptions) {
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.sessionToken = options.sessionToken ?? null;
    this.region = options.region;
    this.endpoint = options.endpoint ?? `https://ce.${options.region}.amazonaws.com`;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  name(): string {
    return "aws-cost-explorer";
  }

  async healthcheck(): Promise<void> {
    if (!this.accessKeyId || !this.secretAccessKey || !this.region) {
      throw new Error("AWS Cost Explorer connector misconfigured: missing access key, secret, or region");
    }
  }

  async poll(since: Date, until: Date, _ctx: ConnectorContext): Promise<CostEvent[]> {
    const target = "AWSInsightsIndexService.GetCostAndUsage";
    const payload = {
      TimePeriod: {
        Start: this.toAwsDate(since),
        End: this.toAwsDate(until)
      },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost", "UsageQuantity"],
      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }]
    };
    const body = JSON.stringify(payload);
    const amzDate = this.amzDate(new Date());
    const dateStamp = amzDate.slice(0, 8);
    const url = new URL(this.endpoint);
    const host = url.host;

    const headers = this.signHeaders({
      method: "POST",
      host,
      amzDate,
      dateStamp,
      target,
      payload: body
    });

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers,
      body
    });

    if (!response.ok) {
      throw new Error(`AWS Cost Explorer poll failed: ${response.status}`);
    }

    const json = (await response.json()) as AwsCostExplorerResponse;
    const buckets = json.ResultsByTime ?? [];
    return buckets.flatMap((bucket) => {
      const date = bucket.TimePeriod?.Start ?? this.toAwsDate(since);
      return (bucket.Groups ?? []).map((group) => this.toCostEvent(date, group));
    });
  }

  private toCostEvent(date: string, group: AwsGroup): CostEvent {
    const service = group.Keys?.[0] ?? "unknown-service";
    const usage = Number(group.Metrics?.UsageQuantity?.Amount ?? 0);
    const cost = Number(group.Metrics?.UnblendedCost?.Amount ?? 0);
    const source_ref = crypto
      .createHash("sha256")
      .update(`${date}|${service}|${usage}|${cost}`)
      .digest("hex");

    return {
      ts: new Date(`${date}T00:00:00.000Z`).toISOString(),
      vendor: "aws",
      service,
      metric: "usage_quantity",
      quantity: usage,
      cost_usd: cost,
      source_ref,
      meta: {
        authoritative: true,
        estimated: false,
        currency: group.Metrics?.UnblendedCost?.Unit ?? "USD"
      }
    };
  }

  private signHeaders(params: {
    method: string;
    host: string;
    amzDate: string;
    dateStamp: string;
    target: string;
    payload: string;
  }): Record<string, string> {
    const service = "ce";
    const payloadHash = this.sha256(params.payload);
    const baseHeaders: Record<string, string> = {
      "content-type": "application/x-amz-json-1.1",
      host: params.host,
      "x-amz-date": params.amzDate,
      "x-amz-target": params.target
    };
    if (this.sessionToken) {
      baseHeaders["x-amz-security-token"] = this.sessionToken;
    }

    const sortedHeaderKeys = Object.keys(baseHeaders).sort();
    const canonicalHeaders = sortedHeaderKeys.map((key) => `${key}:${baseHeaders[key]}`).join("\n");
    const signedHeaders = sortedHeaderKeys.join(";");
    const canonicalRequest = [
      params.method,
      "/",
      "",
      `${canonicalHeaders}\n`,
      signedHeaders,
      payloadHash
    ].join("\n");

    const credentialScope = `${params.dateStamp}/${this.region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      params.amzDate,
      credentialScope,
      this.sha256(canonicalRequest)
    ].join("\n");

    const signingKey = this.signingKey(params.dateStamp, service);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      "Content-Type": "application/x-amz-json-1.1",
      Host: params.host,
      "X-Amz-Date": params.amzDate,
      "X-Amz-Target": params.target,
      ...(this.sessionToken ? { "X-Amz-Security-Token": this.sessionToken } : {}),
      Authorization: authorization
    };
  }

  private signingKey(dateStamp: string, service: string): Buffer {
    const kDate = crypto.createHmac("sha256", `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(this.region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    return crypto.createHmac("sha256", kService).update("aws4_request").digest();
  }

  private sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  private amzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  }

  private toAwsDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
