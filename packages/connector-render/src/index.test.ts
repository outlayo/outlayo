import { describe, expect, it, vi } from "vitest";
import { RenderConnector } from "./index.js";

describe("RenderConnector", () => {
  it("normalizes usage rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "r-1", ts: "2026-03-14T00:00:00.000Z", service: "web", metric: "instance_hours", quantity: 10, cost_usd: 1.9 }]
      })
    });
    const connector = new RenderConnector({ apiKey: "key", ownerId: "owner", fetchImpl: fetchImpl as unknown as typeof fetch });
    const events = await connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });
    expect(events[0].vendor).toBe("render");
  });
});
