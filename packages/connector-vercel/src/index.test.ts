import { describe, expect, it, vi } from "vitest";
import { VercelConnector } from "./index.js";

describe("VercelConnector", () => {
  it("normalizes usage rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "vc-1",
            timestamp: "2026-03-14T00:00:00.000Z",
            product: "edge",
            metric: "requests",
            quantity: 2000,
            cost_usd: 0.4
          }
        ]
      })
    });

    const connector = new VercelConnector({ token: "tok", teamId: "team", fetchImpl: fetchImpl as unknown as typeof fetch });
    const events = await connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });
    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("vercel");
  });
});
