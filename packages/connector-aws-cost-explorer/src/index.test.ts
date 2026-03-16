import { describe, expect, it, vi } from "vitest";
import { AwsCostExplorerConnector } from "./index.js";

describe("AwsCostExplorerConnector", () => {
  it("normalizes cost explorer grouped rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ResultsByTime: [
          {
            TimePeriod: { Start: "2026-03-14", End: "2026-03-15" },
            Groups: [
              {
                Keys: ["AmazonEC2"],
                Metrics: {
                  UnblendedCost: { Amount: "2.50", Unit: "USD" },
                  UsageQuantity: { Amount: "12.0", Unit: "Hrs" }
                }
              }
            ]
          }
        ]
      })
    });

    const connector = new AwsCostExplorerConnector({
      accessKeyId: "AKIAEXAMPLE",
      secretAccessKey: "secret",
      region: "us-east-1",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-14T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("aws");
    expect(events[0].service).toBe("AmazonEC2");
    expect(events[0].cost_usd).toBe(2.5);
    expect(events[0].quantity).toBe(12);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws on upstream failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const connector = new AwsCostExplorerConnector({
      accessKeyId: "AKIAEXAMPLE",
      secretAccessKey: "secret",
      region: "us-east-1",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    await expect(
      connector.poll(new Date("2026-03-14T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
        now: () => new Date("2026-03-15T00:00:00.000Z")
      })
    ).rejects.toThrow("AWS Cost Explorer poll failed");
  });
});
