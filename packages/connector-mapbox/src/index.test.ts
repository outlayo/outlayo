import { describe, expect, it, vi } from "vitest";
import { MapboxConnector } from "./index.js";

describe("MapboxConnector", () => {
  it("normalizes usage with estimated costs", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            timestamp: "2026-03-09T10:00:00.000Z",
            service: "places",
            metric: "requests",
            quantity: 100
          }
        ]
      })
    });

    const connector = new MapboxConnector({
      token: "token",
      username: "acct",
      pricing: { "places.requests": 0.002 },
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-09T09:00:00.000Z"), new Date("2026-03-09T11:00:00.000Z"), {
      now: () => new Date("2026-03-09T11:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("mapbox");
    expect(events[0].metric).toBe("requests");
    expect(events[0].cost_usd).toBe(0.2);
    expect(events[0].meta.estimated).toBe(true);
  });

  it("applies tiered pricing incrementally", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            timestamp: "2026-03-09T10:00:00.000Z",
            service: "mapbox-gl-js",
            metric: "map_loads",
            quantity: 75000
          }
        ]
      })
    });

    const connector = new MapboxConnector({
      token: "token",
      username: "acct",
      pricing: {
        "mapbox-gl-js.map_loads": [
          { upTo: 50000, perUnitUsd: 0 },
          { upTo: 100000, perUnitUsd: 0.005 },
          { perUnitUsd: 0.004 }
        ]
      },
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-09T09:00:00.000Z"), new Date("2026-03-09T11:00:00.000Z"), {
      now: () => new Date("2026-03-09T11:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].cost_usd).toBe(125);
  });

  it("uses service.metric key before metric fallback", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ service: "static-images", metric: "requests", quantity: 1000 }] })
    });
    const connector = new MapboxConnector({
      token: "token",
      username: "acct",
      pricing: { requests: 0.01, "static-images.requests": 0.001 },
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const [event] = await connector.poll(new Date("2026-03-09T09:00:00.000Z"), new Date("2026-03-09T11:00:00.000Z"), {
      now: () => new Date("2026-03-09T11:00:00.000Z")
    });
    expect(event.cost_usd).toBe(1);
  });

  it("keeps deterministic source_ref for same row", async () => {
    const row = {
      timestamp: 1741428000,
      service: "geocoding",
      metric: "requests",
      quantity: 50
    };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ usage: [row] }) });
    const connector = new MapboxConnector({
      token: "token",
      username: "acct",
      pricing: { requests: 0.001 },
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const a = await connector.poll(new Date("2026-03-09T09:00:00.000Z"), new Date("2026-03-09T11:00:00.000Z"), {
      now: () => new Date("2026-03-09T11:00:00.000Z")
    });
    const b = await connector.poll(new Date("2026-03-09T09:00:00.000Z"), new Date("2026-03-09T11:00:00.000Z"), {
      now: () => new Date("2026-03-09T11:00:00.000Z")
    });

    expect(a[0].source_ref).toBe(b[0].source_ref);
  });
});
