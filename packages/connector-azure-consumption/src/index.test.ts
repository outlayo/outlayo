import { describe, expect, it, vi } from "vitest";
import { AzureConsumptionConnector } from "./index.js";

describe("AzureConsumptionConnector", () => {
  it("normalizes Azure usage details rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          {
            id: "azure-1",
            properties: {
              usageStart: "2026-03-14T00:00:00.000Z",
              usageEnd: "2026-03-14T01:00:00.000Z",
              meterCategory: "Virtual Machines",
              meterName: "D2 v5",
              quantity: 2,
              costInBillingCurrency: 1.25,
              billingCurrencyCode: "USD"
            }
          }
        ]
      })
    });

    const connector = new AzureConsumptionConnector({
      subscriptionId: "sub-123",
      bearerToken: "token",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-14T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("azure");
    expect(events[0].service).toBe("Virtual Machines");
    expect(events[0].metric).toBe("D2 v5");
    expect(events[0].cost_usd).toBe(1.25);
  });

  it("throws on upstream failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const connector = new AzureConsumptionConnector({
      subscriptionId: "sub-123",
      bearerToken: "token",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    await expect(
      connector.poll(new Date("2026-03-14T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
        now: () => new Date("2026-03-15T00:00:00.000Z")
      })
    ).rejects.toThrow("Azure consumption poll failed");
  });
});
