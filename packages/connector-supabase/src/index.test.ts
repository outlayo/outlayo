import { describe, expect, it, vi } from "vitest";
import { SupabaseConnector } from "./index.js";

describe("SupabaseConnector", () => {
  it("normalizes usage rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "sb-1",
            timestamp: "2026-03-14T00:00:00.000Z",
            service: "database",
            metric: "compute_hours",
            quantity: 2,
            cost_usd: 1.2,
            confidence: "authoritative"
          }
        ]
      })
    });

    const connector = new SupabaseConnector({
      projectRef: "proj",
      accessToken: "tok",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    const events = await connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });
    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("supabase");
    expect(events[0].source_ref).toBe("sb-1");
  });

  it("falls back to project and org plan when usage endpoint is unavailable", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ref: "proj",
          organization_id: "org-1",
          name: "My Project",
          created_at: "2026-03-10T00:00:00.000Z"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "org-1", plan: "free" })
      });

    const connector = new SupabaseConnector({
      projectRef: "proj",
      accessToken: "tok",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].metric).toBe("plan_status");
    expect(events[0].meta.fallback).toBe(true);
    expect(events[0].meta.plan).toBe("free");
  });
});
