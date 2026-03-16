import { describe, expect, it, vi } from "vitest";
import { RailwayConnector } from "./index.js";

describe("RailwayConnector", () => {
  it("normalizes usage rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          usage: [
            {
              id: "rw-1",
              timestamp: "2026-03-14T00:00:00.000Z",
              service: "postgres",
              metric: "compute_minutes",
              quantity: 60,
              costUsd: 0.35
            }
          ]
        }
      })
    });
    const connector = new RailwayConnector({ apiToken: "tok", projectId: "proj", fetchImpl: fetchImpl as unknown as typeof fetch });
    const events = await connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });
    expect(events[0].vendor).toBe("railway");
  });
});
