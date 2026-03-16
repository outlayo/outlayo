import { describe, expect, it, vi } from "vitest";
import { GcpBillingConnector } from "./index.js";

describe("GcpBillingConnector", () => {
  it("normalizes billing rows into gcp cost events", async () => {
    const queryClient = {
      query: vi.fn().mockResolvedValue([
        [
          {
            invoice_month: "202603",
            project_id: "demo-project",
            service_description: "BigQuery",
            sku_description: "Analysis",
            usage_start_time: "2026-03-08T10:00:00.000Z",
            usage_end_time: "2026-03-08T11:00:00.000Z",
            usage_amount: 5,
            cost: 2.75,
            currency: "USD"
          }
        ]
      ])
    };

    const connector = new GcpBillingConnector({
      projectId: "demo-project",
      dataset: "billing",
      table: "export",
      queryClient
    });

    const events = await connector.poll(new Date("2026-03-08T09:00:00.000Z"), new Date("2026-03-08T12:00:00.000Z"), {
      now: () => new Date("2026-03-08T12:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("gcp");
    expect(events[0].service).toBe("BigQuery");
    expect(events[0].cost_usd).toBe(2.75);
    expect(events[0].source_ref).toHaveLength(64);
  });

  it("keeps source_ref stable for same row", async () => {
    const row = {
      invoice_month: "202603",
      project_id: "demo-project",
      service_description: "Cloud Storage",
      sku_description: "Standard",
      usage_start_time: "2026-03-08T10:00:00.000Z",
      usage_end_time: "2026-03-08T11:00:00.000Z",
      usage_amount: 10,
      cost: 1.5,
      currency: "USD"
    };

    const queryClient = {
      query: vi.fn().mockResolvedValue([[row]])
    };

    const connector = new GcpBillingConnector({
      projectId: "demo-project",
      dataset: "billing",
      table: "export",
      queryClient
    });

    const first = await connector.poll(new Date("2026-03-08T09:00:00.000Z"), new Date("2026-03-08T12:00:00.000Z"), {
      now: () => new Date("2026-03-08T12:00:00.000Z")
    });
    const second = await connector.poll(new Date("2026-03-08T09:00:00.000Z"), new Date("2026-03-08T12:00:00.000Z"), {
      now: () => new Date("2026-03-08T12:00:00.000Z")
    });

    expect(first[0].source_ref).toBe(second[0].source_ref);
  });
});
