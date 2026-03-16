import { describe, expect, it, vi } from "vitest";
import { GcpApiUsageConnector } from "./index.js";

describe("GcpApiUsageConnector", () => {
  it("normalizes places/geocoding usage rows", async () => {
    const queryClient = {
      query: vi.fn().mockResolvedValue([
        [
          { service: "Places API", usage_start_time: "2026-03-11T00:00:00.000Z", usage_amount: 100 },
          { service: "Geocoding API", usage_start_time: "2026-03-11T01:00:00.000Z", usage_amount: 50 }
        ]
      ])
    };

    const connector = new GcpApiUsageConnector({
      projectId: "p",
      dataset: "d",
      table: "t",
      queryClient
    });

    const events = await connector.poll(new Date("2026-03-11T00:00:00.000Z"), new Date("2026-03-11T02:00:00.000Z"), {
      now: () => new Date("2026-03-11T02:00:00.000Z")
    });

    expect(events).toHaveLength(2);
    expect(events[0].metric).toBe("requests");
    expect(events[0].service).toBe("places-api");
    expect(events[1].service).toBe("geocoding-api");
  });
});
