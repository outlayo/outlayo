import { describe, expect, it, vi } from "vitest";
import {
  createExtractorPresets,
  createUsageTracker,
  createUsageTrackerFromEnv,
  instrumentFetch,
  instrumentFetchWithPresets,
  installGlobalFetchTracking,
  sendIngestBatch,
  setupPresetFetch,
  validateIngestEvent
} from "./index.js";

describe("sdk-ingest", () => {
  it("validates required fields", () => {
    const issues = validateIngestEvent({
      ts: "",
      vendor: "",
      service: "",
      metric: "",
      quantity: Number.NaN,
      cost_usd: Number.NaN,
      source_ref: ""
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("sends ingest batch", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: 1 })
    });

    const result = await sendIngestBatch(
      {
        endpoint: "https://example.com/api/ingest/events",
        fetchImpl: fetchImpl as unknown as typeof fetch
      },
      {
        events: [
          {
            ts: "2026-03-14T00:00:00.000Z",
            vendor: "custom-app",
            service: "api",
            metric: "requests",
            quantity: 10,
            cost_usd: 0.01,
            source_ref: "evt-1"
          }
        ]
      }
    );

    expect(result.accepted).toBe(1);
  });

  it("buffers and flushes through tracker", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ accepted: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ accepted: 1 }) });

    const tracker = createUsageTracker({
      endpoint: "https://example.com/api/ingest/events",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      batchSize: 2,
      flushIntervalMs: 0
    });

    tracker.track({
      ts: "2026-03-14T00:00:00.000Z",
      vendor: "custom-app",
      service: "api",
      metric: "requests",
      quantity: 1,
      cost_usd: 0.001,
      source_ref: "evt-1"
    });
    tracker.track({
      ts: "2026-03-14T00:00:01.000Z",
      vendor: "custom-app",
      service: "api",
      metric: "requests",
      quantity: 1,
      cost_usd: 0.001,
      source_ref: "evt-2"
    });

    await tracker.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(tracker.getPendingCount()).toBe(0);
  });

  it("retains queued events when flush fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const onError = vi.fn();
    const tracker = createUsageTracker({
      endpoint: "https://example.com/api/ingest/events",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      flushIntervalMs: 0,
      onError
    });

    tracker.track({
      ts: "2026-03-14T00:00:00.000Z",
      vendor: "custom-app",
      service: "api",
      metric: "requests",
      quantity: 1,
      cost_usd: 0.001,
      source_ref: "evt-fail"
    });

    await expect(tracker.flush()).rejects.toThrow("Outlayo ingest request failed: 500");
    expect(tracker.getPendingCount()).toBe(1);
    expect(onError).toHaveBeenCalled();
  });

  it("instruments fetch and extracts usage events for matching requests", async () => {
    const sendFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accepted: 1 }) });
    const tracker = createUsageTracker({
      endpoint: "https://outlayo.local/api/ingest/events",
      fetchImpl: sendFetch as unknown as typeof fetch,
      flushIntervalMs: 0
    });

    const wrappedFetch = instrumentFetch(
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ usage: { total_tokens: 42 } }), { status: 200 })),
      {
        tracker,
        match: ({ url }) => url.includes("api.openai.com"),
        extractors: [
          ({ url, durationMs }) => [
            {
              ts: "2026-03-14T00:00:00.000Z",
              vendor: "openai",
              service: "chat.completions",
              metric: "requests",
              quantity: 1,
              cost_usd: 0,
              source_ref: `${url}|${durationMs}`
            }
          ]
        ]
      }
    );

    await wrappedFetch("https://api.openai.com/v1/chat/completions", { method: "POST" });
    expect(tracker.getPendingCount()).toBe(1);
    const flush = await tracker.flush();
    expect(flush.accepted).toBe(1);
  });

  it("does not extract for non-matching requests", async () => {
    const tracker = createUsageTracker({
      endpoint: "https://outlayo.local/api/ingest/events",
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accepted: 1 }) }) as unknown as typeof fetch,
      flushIntervalMs: 0
    });

    const wrappedFetch = instrumentFetch(vi.fn().mockResolvedValue(new Response("ok", { status: 200 })), {
      tracker,
      match: ({ url }) => url.includes("api.openai.com"),
      extractors: [
        () => [
          {
            ts: "2026-03-14T00:00:00.000Z",
            vendor: "openai",
            service: "chat.completions",
            metric: "requests",
            quantity: 1,
            cost_usd: 0,
            source_ref: "evt-non-match"
          }
        ]
      ]
    });

    await wrappedFetch("https://example.com/health");
    expect(tracker.getPendingCount()).toBe(0);
  });

  it("builds openai preset extractor and emits estimated event", async () => {
    const [extractor] = createExtractorPresets([{ name: "openai" }]);
    const events = await extractor({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      input: "https://api.openai.com/v1/chat/completions",
      durationMs: 12,
      response: new Response(
        JSON.stringify({ id: "chatcmpl-1", model: "gpt-4o-mini", usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }),
        { status: 200 }
      )
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("openai");
    expect(events[0].metric).toBe("tokens.total");
    expect(events[0].quantity).toBe(15);
    expect(events[0].cost_usd).toBe(0);
    expect(events[0].meta?.confidence).toBe("estimated");
    expect(events[0].meta?.pricing_incomplete).toBe(true);
    expect(events[0].source_ref).toContain("openai:chatcmpl-1:tokens.total");
  });

  it("sanitizes fallback preset identifiers and persists only allowlisted meta", async () => {
    const [extractor] = createExtractorPresets([{ name: "openai" }]);
    const events = await extractor({
      url: "https://api.openai.com/v1/chat/completions?api_key=secret&email=user@example.com",
      method: "POST",
      input: "https://api.openai.com/v1/chat/completions?api_key=secret&email=user@example.com",
      durationMs: 5,
      response: new Response(JSON.stringify({ usage: { total_tokens: 5 }, model: "gpt-4o-mini" }), { status: 200 })
    });

    expect(events).toHaveLength(1);
    expect(events[0].source_ref).not.toContain("api_key");
    expect(events[0].source_ref).not.toContain("email=");
    expect(events[0].meta).not.toHaveProperty("url");
  });

  it("builds mapbox preset extractor for geocoding requests", async () => {
    const [extractor] = createExtractorPresets([{ name: "mapbox", pricingByServiceMetric: { "geocoding.requests": 0.002 } }]);
    const events = await extractor({
      url: "https://api.mapbox.com/geocoding/v5/mapbox.places/london.json?access_token=secret",
      method: "GET",
      input: "https://api.mapbox.com/geocoding/v5/mapbox.places/london.json?access_token=secret",
      durationMs: 4,
      response: new Response("{}", { status: 200 })
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("mapbox");
    expect(events[0].service).toBe("geocoding");
    expect(events[0].cost_usd).toBe(0.002);
    expect(events[0].source_ref).not.toContain("access_token");
  });

  it("builds gcp places preset extractor", async () => {
    const [extractor] = createExtractorPresets([{ name: "gcp-places", pricePerRequestUsd: 0.017 }]);
    const events = await extractor({
      url: "https://places.googleapis.com/v1/places:searchText",
      method: "POST",
      input: "https://places.googleapis.com/v1/places:searchText",
      durationMs: 3,
      response: new Response("{}", { status: 200 })
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("gcp");
    expect(events[0].service).toBe("places-api");
    expect(events[0].cost_usd).toBe(0.017);
  });

  it("builds gcp locations preset extractor as geocoding usage", async () => {
    const [extractor] = createExtractorPresets([{ name: "gcp-locations", pricePerRequestUsd: 0.005 }]);
    const events = await extractor({
      url: "https://maps.googleapis.com/maps/api/geocode/json?address=Paris&key=secret",
      method: "GET",
      input: "https://maps.googleapis.com/maps/api/geocode/json?address=Paris&key=secret",
      durationMs: 6,
      response: new Response("{}", { status: 200 })
    });

    expect(events).toHaveLength(1);
    expect(events[0].service).toBe("geocoding-api");
    expect(events[0].source_ref).not.toContain("address=Paris");
  });

  it("builds resend preset extractor from email send requests", async () => {
    const [extractor] = createExtractorPresets([{ name: "resend", pricePerEmailUsd: 0.001 }]);
    const events = await extractor({
      url: "https://api.resend.com/emails",
      method: "POST",
      input: "https://api.resend.com/emails",
      init: { body: JSON.stringify({ to: ["a@example.com", "b@example.com"] }) },
      durationMs: 4,
      response: new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("resend");
    expect(events[0].metric).toBe("emails.sent");
    expect(events[0].quantity).toBe(2);
    expect(events[0].cost_usd).toBe(0.002);
  });

  it("applies openai pricing table when configured", async () => {
    const [extractor] = createExtractorPresets([
      { name: "openai", pricingByModel: { "gpt-4o-mini": { inputUsdPer1k: 0.15, outputUsdPer1k: 0.6 } } }
    ]);
    const events = await extractor({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      input: "https://api.openai.com/v1/chat/completions",
      durationMs: 7,
      response: new Response(
        JSON.stringify({ id: "chatcmpl-2", model: "gpt-4o-mini", usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 } }),
        { status: 200 }
      )
    });

    expect(events).toHaveLength(1);
    expect(events[0].cost_usd).toBe(0.45);
    expect(events[0].meta?.pricing_applied).toBe(true);
  });

  it("wires preset extraction through instrumentFetchWithPresets", async () => {
    const sendFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accepted: 1 }) });
    const tracker = createUsageTracker({
      endpoint: "https://outlayo.local/api/ingest/events",
      fetchImpl: sendFetch as unknown as typeof fetch,
      flushIntervalMs: 0
    });

    const wrappedFetch = instrumentFetchWithPresets(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "chatcmpl-3", model: "gpt-4o-mini", usage: { total_tokens: 42 } }), { status: 200 })
      ),
      {
        tracker,
        presets: [{ name: "openai" }]
      }
    );

    await wrappedFetch("https://api.openai.com/v1/chat/completions", { method: "POST" });
    expect(tracker.getPendingCount()).toBe(1);
    await tracker.flush();
    expect(sendFetch).toHaveBeenCalledTimes(1);
  });

  it("creates tracker from env defaults", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accepted: 1 }) });
    const tracker = createUsageTrackerFromEnv({
      env: {
        OUTLAYO_INGEST_ENDPOINT: "https://env.example/api/ingest/events",
        OUTLAYO_ADMIN_TOKEN: "secret",
        OUTLAYO_BATCH_SIZE: "2"
      },
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    tracker.track({
      ts: "2026-03-14T00:00:00.000Z",
      vendor: "custom-app",
      service: "api",
      metric: "requests",
      quantity: 1,
      cost_usd: 0.001,
      source_ref: "env-1"
    });
    tracker.track({
      ts: "2026-03-14T00:00:01.000Z",
      vendor: "custom-app",
      service: "api",
      metric: "requests",
      quantity: 1,
      cost_usd: 0.001,
      source_ref: "env-2"
    });

    await tracker.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sets up preset fetch in one call", async () => {
    const combinedFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("env.example/api/ingest/events")) {
        return { ok: true, json: async () => ({ accepted: 1 }) } as Response;
      }
      return new Response(JSON.stringify({ id: "chatcmpl-4", model: "gpt-4o-mini", usage: { total_tokens: 10 } }), { status: 200 });
    });

    const runtime = setupPresetFetch({
      env: { OUTLAYO_INGEST_ENDPOINT: "https://env.example/api/ingest/events" },
      fetchImpl: combinedFetch as unknown as typeof fetch,
      presets: [{ name: "openai" }]
    });

    await runtime.fetch("https://api.openai.com/v1/chat/completions", { method: "POST" });
    await runtime.flush();
    expect(combinedFetch).toHaveBeenCalledTimes(2);
  });

  it("installs and restores global fetch tracking explicitly", async () => {
    const originalFetch = globalThis.fetch;
    const combinedFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("env.example/api/ingest/events")) {
        return { ok: true, json: async () => ({ accepted: 1 }) } as Response;
      }
      return new Response(JSON.stringify({ id: "chatcmpl-5", model: "gpt-4o-mini", usage: { total_tokens: 8 } }), { status: 200 });
    });

    globalThis.fetch = combinedFetch as unknown as typeof fetch;
    const installed = installGlobalFetchTracking({
      env: { OUTLAYO_INGEST_ENDPOINT: "https://env.example/api/ingest/events" },
      presets: [{ name: "openai" }]
    });

    await globalThis.fetch("https://api.openai.com/v1/chat/completions", { method: "POST" });
    await installed.flush();
    expect(combinedFetch).toHaveBeenCalledTimes(2);

    installed.restore();
    expect(globalThis.fetch).toBe(combinedFetch);
    globalThis.fetch = originalFetch;
  });
});
