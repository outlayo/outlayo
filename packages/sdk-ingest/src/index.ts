import type { IngestBatchInput, IngestEventInput } from "@outlayo/core";

export interface OutlayoIngestClientOptions {
  endpoint: string;
  adminHeaderName?: string;
  adminToken?: string;
  fetchImpl?: typeof fetch;
}

export interface UsageTrackerErrorContext {
  stage: "validate" | "enqueue" | "flush" | "extract";
  error: Error;
  droppedEvents?: number;
}

export interface UsageTrackerConfig extends OutlayoIngestClientOptions {
  batchSize?: number;
  flushIntervalMs?: number;
  maxQueueSize?: number;
  onError?: (context: UsageTrackerErrorContext) => void;
}

export interface UsageTracker {
  track(event: IngestEventInput): void;
  trackMany(events: IngestEventInput[]): void;
  flush(): Promise<{ accepted: number; sent: number; pending: number }>;
  shutdown(): Promise<void>;
  getPendingCount(): number;
}

export interface FetchMatchContext {
  url: string;
  method: string;
  input: RequestInfo | URL;
  init?: RequestInit;
}

export interface FetchExtractContext extends FetchMatchContext {
  durationMs: number;
  response?: Response;
  error?: unknown;
}

export type FetchMatcher = (context: FetchMatchContext) => boolean;
export type UsageExtractor = (context: FetchExtractContext) => IngestEventInput[] | Promise<IngestEventInput[]>;

export interface InstrumentFetchOptions {
  tracker: UsageTracker;
  match?: FetchMatcher;
  extractors: UsageExtractor[];
  onExtractorError?: (context: { error: Error; extractorIndex: number; url: string; method: string }) => void;
}

export type ExtractorPresetName = "openai" | "mapbox" | "gcp-places" | "gcp-locations" | "resend";

export interface OpenAIPricingModelEntry {
  inputUsdPer1k: number;
  outputUsdPer1k: number;
}

export interface OpenAIExtractorPresetConfig {
  name: "openai";
  pricingByModel?: Record<string, OpenAIPricingModelEntry>;
  defaultService?: string;
}

export interface RequestPricingPresetConfig {
  pricingByServiceMetric?: Record<string, number>;
  pricingByMetric?: Record<string, number>;
}

export interface MapboxExtractorPresetConfig extends RequestPricingPresetConfig {
  name: "mapbox";
}

export interface GcpPlacesExtractorPresetConfig {
  name: "gcp-places";
  pricePerRequestUsd?: number;
}

export interface GcpLocationsExtractorPresetConfig {
  name: "gcp-locations";
  pricePerRequestUsd?: number;
}

export interface ResendExtractorPresetConfig {
  name: "resend";
  pricePerEmailUsd?: number;
}

export type ExtractorPresetConfig =
  | OpenAIExtractorPresetConfig
  | MapboxExtractorPresetConfig
  | GcpPlacesExtractorPresetConfig
  | GcpLocationsExtractorPresetConfig
  | ResendExtractorPresetConfig;

export interface PresetInstrumentFetchOptions {
  tracker: UsageTracker;
  presets: ExtractorPresetConfig[];
  match?: FetchMatcher;
  onExtractorError?: (context: { error: Error; extractorIndex: number; url: string; method: string }) => void;
}

export interface UsageTrackerEnvOptions {
  env?: Record<string, string | undefined>;
  endpointVar?: string;
  adminTokenVar?: string;
  adminHeaderNameVar?: string;
  batchSizeVar?: string;
  flushIntervalMsVar?: string;
  maxQueueSizeVar?: string;
  fetchImpl?: typeof fetch;
  onError?: (context: UsageTrackerErrorContext) => void;
}

export interface ZeroManualPresetSetupOptions extends UsageTrackerEnvOptions {
  presets: ExtractorPresetConfig[];
  fetchImpl?: typeof fetch;
  match?: FetchMatcher;
  onExtractorError?: (context: { error: Error; extractorIndex: number; url: string; method: string }) => void;
}

export interface PresetFetchRuntime {
  tracker: UsageTracker;
  fetch: typeof fetch;
  flush: UsageTracker["flush"];
  shutdown: UsageTracker["shutdown"];
  getPendingCount: UsageTracker["getPendingCount"];
}

export interface InstalledPresetFetchRuntime extends PresetFetchRuntime {
  restore(): void;
}

const DEFAULT_ALLOWED_META_KEYS = [
  "confidence",
  "authoritative",
  "estimated",
  "reconciled",
  "extraction_preset",
  "model",
  "service_class",
  "input_tokens",
  "output_tokens",
  "recipient_count",
  "pricing_applied",
  "pricing_incomplete",
  "quantity_basis"
] as const;

export function validateIngestEvent(event: IngestEventInput): string[] {
  const issues: string[] = [];
  if (!event.ts || Number.isNaN(new Date(event.ts).getTime())) issues.push("ts must be a valid ISO timestamp");
  if (!event.vendor) issues.push("vendor is required");
  if (!event.service) issues.push("service is required");
  if (!event.metric) issues.push("metric is required");
  if (!Number.isFinite(event.quantity)) issues.push("quantity must be numeric");
  if (!Number.isFinite(event.cost_usd)) issues.push("cost_usd must be numeric");
  if (!event.source_ref) issues.push("source_ref is required");
  return issues;
}

export async function sendIngestBatch(options: OutlayoIngestClientOptions, input: IngestBatchInput): Promise<{ accepted: number }> {
  for (const event of input.events) {
    const issues = validateIngestEvent(event);
    if (issues.length > 0) {
      throw new Error(`Invalid ingest event: ${issues.join(", ")}`);
    }
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(options.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.adminToken
        ? {
            [options.adminHeaderName ?? "x-outlayo-admin-token"]: options.adminToken
          }
        : {})
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(`Outlayo ingest request failed: ${response.status}`);
  }

  return (await response.json()) as { accepted: number };
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function normalizeTrackerConfig(config: UsageTrackerConfig): Required<
  Pick<UsageTrackerConfig, "batchSize" | "flushIntervalMs" | "maxQueueSize">
> {
  return {
    batchSize: Math.max(1, Math.floor(config.batchSize ?? 100)),
    flushIntervalMs: Math.max(0, Math.floor(config.flushIntervalMs ?? 5000)),
    maxQueueSize: Math.max(1, Math.floor(config.maxQueueSize ?? 5000))
  };
}

function parseNumberEnv(value: string | undefined, label: string): number | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be numeric`);
  }
  return parsed;
}

function sanitizeUrlForStorage(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl.split("?")[0]?.split("#")[0] ?? rawUrl;
  }
}

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const key of DEFAULT_ALLOWED_META_KEYS) {
    if (key in meta) {
      sanitized[key] = meta[key];
    }
  }
  return sanitized;
}

function parseJsonResponse(response: Response | undefined): Promise<Record<string, unknown> | null> {
  if (!response) {
    return Promise.resolve(null);
  }
  return response
    .clone()
    .json()
    .then((value) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null))
    .catch(() => null);
}

function buildEstimatedMeta(extra: Record<string, unknown>): Record<string, unknown> {
  return sanitizeMeta({
    confidence: "estimated",
    authoritative: false,
    estimated: true,
    reconciled: false,
    ...extra
  });
}

function resolveRequestPricing(
  service: string,
  metric: string,
  config: RequestPricingPresetConfig | undefined
): { price: number; applied: boolean } {
  const serviceMetricKey = `${service}.${metric}`;
  const direct = config?.pricingByServiceMetric?.[serviceMetricKey];
  if (typeof direct === "number") {
    return { price: direct, applied: true };
  }
  const metricPrice = config?.pricingByMetric?.[metric];
  if (typeof metricPrice === "number") {
    return { price: metricPrice, applied: true };
  }
  return { price: 0, applied: false };
}

function buildPresetSourceRef(prefix: string, responseId: string | undefined, context: FetchExtractContext, metric: string): string {
  if (responseId) {
    return `${prefix}:${responseId}:${metric}`;
  }
  return `${prefix}:${context.method}:${sanitizeUrlForStorage(context.url)}:${metric}:${new Date().toISOString()}`;
}

function shouldTrackSuccessfulJsonRequest(context: FetchExtractContext): boolean {
  return Boolean(context.response && context.response.ok && !context.error);
}

function readEnv(options?: UsageTrackerEnvOptions): Record<string, string | undefined> {
  if (options?.env) {
    return options.env;
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }
  return {};
}

export function createUsageTrackerFromEnv(options?: UsageTrackerEnvOptions): UsageTracker {
  const env = readEnv(options);
  const endpoint = env[options?.endpointVar ?? "OUTLAYO_INGEST_ENDPOINT"];
  if (!endpoint) {
    throw new Error(`Missing ${options?.endpointVar ?? "OUTLAYO_INGEST_ENDPOINT"} for Outlayo SDK setup`);
  }

  return createUsageTracker({
    endpoint,
    adminToken: env[options?.adminTokenVar ?? "OUTLAYO_ADMIN_TOKEN"],
    adminHeaderName: env[options?.adminHeaderNameVar ?? "OUTLAYO_ADMIN_HEADER_NAME"],
    batchSize: parseNumberEnv(env[options?.batchSizeVar ?? "OUTLAYO_BATCH_SIZE"], options?.batchSizeVar ?? "OUTLAYO_BATCH_SIZE"),
    flushIntervalMs: parseNumberEnv(
      env[options?.flushIntervalMsVar ?? "OUTLAYO_FLUSH_INTERVAL_MS"],
      options?.flushIntervalMsVar ?? "OUTLAYO_FLUSH_INTERVAL_MS"
    ),
    maxQueueSize: parseNumberEnv(
      env[options?.maxQueueSizeVar ?? "OUTLAYO_MAX_QUEUE_SIZE"],
      options?.maxQueueSizeVar ?? "OUTLAYO_MAX_QUEUE_SIZE"
    ),
    fetchImpl: options?.fetchImpl,
    onError: options?.onError
  });
}

export function createUsageTracker(config: UsageTrackerConfig): UsageTracker {
  const normalized = normalizeTrackerConfig(config);
  const queue: IngestEventInput[] = [];
  let flushPromise: Promise<{ accepted: number; sent: number; pending: number }> | null = null;

  const notifyError = (context: UsageTrackerErrorContext): void => {
    config.onError?.(context);
  };

  const flushInternal = async (): Promise<{ accepted: number; sent: number; pending: number }> => {
    if (flushPromise) {
      return flushPromise;
    }

    flushPromise = (async () => {
      let accepted = 0;
      let sent = 0;
      while (queue.length > 0) {
        const chunk = queue.splice(0, normalized.batchSize);
        try {
          const result = await sendIngestBatch(config, { events: chunk });
          accepted += result.accepted;
          sent += chunk.length;
        } catch (error) {
          queue.unshift(...chunk);
          const wrapped = toError(error);
          notifyError({ stage: "flush", error: wrapped });
          throw wrapped;
        }
      }
      return { accepted, sent, pending: queue.length };
    })();

    try {
      return await flushPromise;
    } finally {
      flushPromise = null;
    }
  };

  const maybeFlush = (): void => {
    if (queue.length >= normalized.batchSize) {
      void flushInternal().catch(() => undefined);
    }
  };

  const interval =
    normalized.flushIntervalMs > 0 ? setInterval(() => void flushInternal().catch(() => undefined), normalized.flushIntervalMs) : null;

  if (interval && typeof interval.unref === "function") {
    interval.unref();
  }

  const enqueueValidated = (event: IngestEventInput): void => {
    const issues = validateIngestEvent(event);
    if (issues.length > 0) {
      const error = new Error(`Invalid ingest event: ${issues.join(", ")}`);
      notifyError({ stage: "validate", error });
      throw error;
    }

    if (queue.length >= normalized.maxQueueSize) {
      const error = new Error(`Usage tracker queue is full (${normalized.maxQueueSize} events)`);
      notifyError({ stage: "enqueue", error, droppedEvents: 1 });
      throw error;
    }

    queue.push(event);
    maybeFlush();
  };

  return {
    track(event: IngestEventInput): void {
      enqueueValidated(event);
    },
    trackMany(events: IngestEventInput[]): void {
      for (const event of events) {
        enqueueValidated(event);
      }
    },
    flush: flushInternal,
    async shutdown(): Promise<void> {
      if (interval) {
        clearInterval(interval);
      }
      await flushInternal();
    },
    getPendingCount(): number {
      return queue.length;
    }
  };
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }
  return String(input);
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (typeof init?.method === "string" && init.method.length > 0) {
    return init.method.toUpperCase();
  }
  if (typeof Request !== "undefined" && input instanceof Request && typeof input.method === "string") {
    return input.method.toUpperCase();
  }
  return "GET";
}

export function instrumentFetch(fetchFn: typeof fetch, options: InstrumentFetchOptions): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = resolveUrl(input);
    const method = resolveMethod(input, init);
    const contextBase: FetchMatchContext = { url, method, input, init };
    const matched = options.match ? options.match(contextBase) : true;
    if (!matched || options.extractors.length === 0) {
      return fetchFn(input, init);
    }

    const started = Date.now();
    let response: Response | undefined;
    let error: unknown;

    try {
      response = await fetchFn(input, init);
      return response;
    } catch (caught) {
      error = caught;
      throw caught;
    } finally {
      const extractContext: FetchExtractContext = {
        ...contextBase,
        durationMs: Math.max(0, Date.now() - started),
        response,
        error
      };

      for (const [extractorIndex, extractor] of options.extractors.entries()) {
        try {
          const events = await extractor(extractContext);
          if (events.length > 0) {
            options.tracker.trackMany(events);
          }
        } catch (extractError) {
          const wrapped = toError(extractError);
          options.onExtractorError?.({ error: wrapped, extractorIndex, url, method });
        }
      }
    }
  };
}

function maybeJsonParse(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function resolveRequestModel(input: RequestInfo | URL, init?: RequestInit): string | undefined {
  const fromInit = maybeJsonParse(init?.body);
  if (typeof fromInit?.model === "string" && fromInit.model.length > 0) {
    return fromInit.model;
  }
  if (typeof Request !== "undefined" && input instanceof Request) {
    return undefined;
  }
  return undefined;
}

function createOpenAIPresetExtractor(config: OpenAIExtractorPresetConfig): UsageExtractor {
  return async (context: FetchExtractContext): Promise<IngestEventInput[]> => {
    if (!context.response || context.method !== "POST" || !context.url.includes("api.openai.com")) {
      return [];
    }
    if (!context.url.includes("/v1/chat/completions") && !context.url.includes("/v1/responses")) {
      return [];
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = (await context.response.clone().json()) as Record<string, unknown>;
    } catch {
      return [];
    }
    if (!payload || typeof payload !== "object") {
      return [];
    }

    const usageRaw = payload.usage as Record<string, unknown> | undefined;
    if (!usageRaw || typeof usageRaw !== "object") {
      return [];
    }

    const inputTokensRaw = usageRaw.prompt_tokens ?? usageRaw.input_tokens;
    const outputTokensRaw = usageRaw.completion_tokens ?? usageRaw.output_tokens;
    const totalTokensRaw = usageRaw.total_tokens;

    const inputTokens = Number.isFinite(Number(inputTokensRaw)) ? Number(inputTokensRaw) : 0;
    const outputTokens = Number.isFinite(Number(outputTokensRaw)) ? Number(outputTokensRaw) : 0;
    const totalTokens = Number.isFinite(Number(totalTokensRaw)) ? Number(totalTokensRaw) : inputTokens + outputTokens;
    if (totalTokens <= 0) {
      return [];
    }

    const payloadModel = typeof payload.model === "string" ? payload.model : undefined;
    const requestModel = resolveRequestModel(context.input, context.init);
    const model = payloadModel ?? requestModel ?? "unknown";

    const pricing = config.pricingByModel?.[model];
    const hasPricing = Boolean(pricing);
    const estimatedCost = hasPricing
      ? Number(((inputTokens / 1000) * pricing!.inputUsdPer1k + (outputTokens / 1000) * pricing!.outputUsdPer1k).toFixed(8))
      : 0;

    const ts = new Date().toISOString();
    const sanitizedUrl = sanitizeUrlForStorage(context.url);
    const responseId = typeof payload.id === "string" ? payload.id : `${context.method}:${sanitizedUrl}:${ts}`;

    return [
      {
        ts,
        vendor: "openai",
        service: config.defaultService ?? "chat.completions",
        metric: "tokens.total",
        quantity: totalTokens,
        cost_usd: estimatedCost,
        source_ref: `openai:${responseId}:tokens.total`,
        meta: sanitizeMeta({
          confidence: "estimated",
          authoritative: false,
          estimated: true,
          reconciled: false,
          extraction_preset: "openai",
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          pricing_applied: hasPricing,
          pricing_incomplete: !hasPricing
        })
      }
    ];
  };
}

function createMapboxPresetExtractor(config: MapboxExtractorPresetConfig): UsageExtractor {
  return async (context: FetchExtractContext): Promise<IngestEventInput[]> => {
    if (!shouldTrackSuccessfulJsonRequest(context) || !context.url.includes("api.mapbox.com")) {
      return [];
    }
    const sanitizedUrl = sanitizeUrlForStorage(context.url);
    let service = "mapbox";
    if (sanitizedUrl.includes("/geocoding/")) service = "geocoding";
    else if (sanitizedUrl.includes("/directions/")) service = "directions";
    else if (sanitizedUrl.includes("/styles/")) service = "map-loads";
    else if (sanitizedUrl.includes("/static/")) service = "static-images";

    const metric = "requests";
    const { price, applied } = resolveRequestPricing(service, metric, config);
    return [
      {
        ts: new Date().toISOString(),
        vendor: "mapbox",
        service,
        metric,
        quantity: 1,
        cost_usd: Number(price.toFixed(8)),
        source_ref: buildPresetSourceRef("mapbox", undefined, context, metric),
        meta: buildEstimatedMeta({
          extraction_preset: "mapbox",
          service_class: service,
          pricing_applied: applied,
          pricing_incomplete: !applied,
          quantity_basis: "request_count"
        })
      }
    ];
  };
}

function createGcpPlacesPresetExtractor(config: GcpPlacesExtractorPresetConfig): UsageExtractor {
  return async (context: FetchExtractContext): Promise<IngestEventInput[]> => {
    if (!shouldTrackSuccessfulJsonRequest(context)) {
      return [];
    }
    const url = sanitizeUrlForStorage(context.url).toLowerCase();
    const matches = url.includes("places.googleapis.com") || url.includes("/place/") || url.includes("places:search") || url.includes("places:autocomplete");
    if (!matches) {
      return [];
    }
    const price = config.pricePerRequestUsd ?? 0;
    return [
      {
        ts: new Date().toISOString(),
        vendor: "gcp",
        service: "places-api",
        metric: "requests",
        quantity: 1,
        cost_usd: Number(price.toFixed(8)),
        source_ref: buildPresetSourceRef("gcp-places", undefined, context, "requests"),
        meta: buildEstimatedMeta({
          extraction_preset: "gcp-places",
          service_class: "places-api",
          pricing_applied: price > 0,
          pricing_incomplete: price <= 0,
          quantity_basis: "request_count"
        })
      }
    ];
  };
}

function createGcpLocationsPresetExtractor(config: GcpLocationsExtractorPresetConfig): UsageExtractor {
  return async (context: FetchExtractContext): Promise<IngestEventInput[]> => {
    if (!shouldTrackSuccessfulJsonRequest(context)) {
      return [];
    }
    const url = sanitizeUrlForStorage(context.url).toLowerCase();
    const matches = url.includes("/geocode") || url.includes("geocode/json") || url.includes("geocoding.googleapis.com");
    if (!matches) {
      return [];
    }
    const price = config.pricePerRequestUsd ?? 0;
    return [
      {
        ts: new Date().toISOString(),
        vendor: "gcp",
        service: "geocoding-api",
        metric: "requests",
        quantity: 1,
        cost_usd: Number(price.toFixed(8)),
        source_ref: buildPresetSourceRef("gcp-locations", undefined, context, "requests"),
        meta: buildEstimatedMeta({
          extraction_preset: "gcp-locations",
          service_class: "geocoding-api",
          pricing_applied: price > 0,
          pricing_incomplete: price <= 0,
          quantity_basis: "request_count"
        })
      }
    ];
  };
}

function createResendPresetExtractor(config: ResendExtractorPresetConfig): UsageExtractor {
  return async (context: FetchExtractContext): Promise<IngestEventInput[]> => {
    if (!shouldTrackSuccessfulJsonRequest(context) || context.method !== "POST" || !context.url.includes("api.resend.com")) {
      return [];
    }
    if (!sanitizeUrlForStorage(context.url).includes("/emails")) {
      return [];
    }
    const requestBody = maybeJsonParse(context.init?.body);
    const toField = requestBody?.to;
    const recipientCount = Array.isArray(toField) ? toField.length : typeof toField === "string" && toField.length > 0 ? 1 : 1;
    const payload = await parseJsonResponse(context.response);
    const responseId = typeof payload?.id === "string" ? payload.id : undefined;
    const price = (config.pricePerEmailUsd ?? 0) * recipientCount;
    return [
      {
        ts: new Date().toISOString(),
        vendor: "resend",
        service: "emails",
        metric: "emails.sent",
        quantity: recipientCount,
        cost_usd: Number(price.toFixed(8)),
        source_ref: buildPresetSourceRef("resend", responseId, context, "emails.sent"),
        meta: buildEstimatedMeta({
          extraction_preset: "resend",
          recipient_count: recipientCount,
          pricing_applied: price > 0,
          pricing_incomplete: price <= 0,
          quantity_basis: "recipient_count"
        })
      }
    ];
  };
}

export function createExtractorPresets(configs: ExtractorPresetConfig[]): UsageExtractor[] {
  const extractors: UsageExtractor[] = [];
  for (const config of configs) {
    if (config.name === "openai") {
      extractors.push(createOpenAIPresetExtractor(config));
    } else if (config.name === "mapbox") {
      extractors.push(createMapboxPresetExtractor(config));
    } else if (config.name === "gcp-places") {
      extractors.push(createGcpPlacesPresetExtractor(config));
    } else if (config.name === "gcp-locations") {
      extractors.push(createGcpLocationsPresetExtractor(config));
    } else if (config.name === "resend") {
      extractors.push(createResendPresetExtractor(config));
    }
  }
  return extractors;
}

export function instrumentFetchWithPresets(fetchFn: typeof fetch, options: PresetInstrumentFetchOptions): typeof fetch {
  const presetExtractors = createExtractorPresets(options.presets);
  return instrumentFetch(fetchFn, {
    tracker: options.tracker,
    match: options.match,
    extractors: presetExtractors,
    onExtractorError: options.onExtractorError
  });
}

export function setupPresetFetch(options: ZeroManualPresetSetupOptions): PresetFetchRuntime {
  const tracker = createUsageTrackerFromEnv(options);
  const baseFetch = options.fetchImpl ?? fetch;
  const instrumentedFetch = instrumentFetchWithPresets(baseFetch, {
    tracker,
    presets: options.presets,
    match: options.match,
    onExtractorError: options.onExtractorError
  });

  return {
    tracker,
    fetch: instrumentedFetch,
    flush: () => tracker.flush(),
    shutdown: () => tracker.shutdown(),
    getPendingCount: () => tracker.getPendingCount()
  };
}

export function installGlobalFetchTracking(options: ZeroManualPresetSetupOptions): InstalledPresetFetchRuntime {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("globalThis.fetch is not available in this runtime");
  }

  const originalFetch = globalThis.fetch;
  const runtime = setupPresetFetch({ ...options, fetchImpl: originalFetch });
  globalThis.fetch = runtime.fetch;

  return {
    ...runtime,
    restore(): void {
      globalThis.fetch = originalFetch;
    }
  };
}
