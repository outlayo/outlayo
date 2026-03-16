import { describe, expect, it, vi } from "vitest";
import { CloudflareConnector } from "./index.js";

describe("CloudflareConnector", () => {
  it("normalizes subscription rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: [
          {
            id: "cf-1",
            current_period_start: "2026-03-01T00:00:00.000Z",
            current_period_end: "2026-04-01T00:00:00.000Z",
            currency: "USD",
            price: 20,
            product: { name: "Workers Paid" }
          }
        ]
      })
    });
    const connector = new CloudflareConnector({ apiToken: "tok", accountId: "acc", fetchImpl: fetchImpl as unknown as typeof fetch });
    const events = await connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });
    expect(events[0].vendor).toBe("cloudflare");
    expect(events[0].metric).toBe("subscription_price");
    expect(events[0].cost_usd).toBe(20);
  });
});
