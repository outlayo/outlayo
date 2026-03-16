import { describe, expect, it, vi } from "vitest";
import { OpenAIConnector } from "./index.js";

describe("OpenAIConnector", () => {
  it("normalizes usage into cost events", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            timestamp: "2026-03-08T10:00:00.000Z",
            model: "gpt-4o-mini",
            input_tokens: 1000,
            output_tokens: 500,
            id: "evt_1"
          }
        ]
      })
    });

    const connector = new OpenAIConnector({
      apiKey: "test",
      project: null,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-08T08:00:00.000Z"), new Date("2026-03-08T10:00:00.000Z"), {
      now: () => new Date("2026-03-08T10:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("openai");
    expect(events[0].source_ref).toBe("evt_1");
    expect(events[0].quantity).toBe(1500);
  });

  it("accepts unix-second timestamps", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            start_time: 1741428000,
            model: "gpt-4o-mini",
            input_tokens: 500,
            output_tokens: 500,
            id: "evt_2"
          }
        ]
      })
    });

    const connector = new OpenAIConnector({
      apiKey: "test",
      project: null,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-08T08:00:00.000Z"), new Date("2026-03-08T10:00:00.000Z"), {
      now: () => new Date("2026-03-08T10:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].ts).toMatch(/Z$/);
  });

  it("throws on upstream error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const connector = new OpenAIConnector({
      apiKey: "test",
      project: null,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    await expect(
      connector.poll(new Date("2026-03-08T08:00:00.000Z"), new Date("2026-03-08T10:00:00.000Z"), {
        now: () => new Date("2026-03-08T10:00:00.000Z")
      })
    ).rejects.toThrow("OpenAI usage poll failed");
  });
});
