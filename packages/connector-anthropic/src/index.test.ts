import { describe, expect, it, vi } from "vitest";
import { AnthropicConnector } from "./index.js";

describe("AnthropicConnector", () => {
  it("normalizes usage rows into anthropic cost events", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "anth-evt-1",
            timestamp: "2026-03-14T00:00:00.000Z",
            model: "claude-3-5-sonnet",
            input_tokens: 1000,
            output_tokens: 500,
            cost_usd: 0.0045
          }
        ]
      })
    });

    const connector = new AnthropicConnector({
      apiKey: "test",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    const events = await connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
      now: () => new Date("2026-03-15T00:00:00.000Z")
    });

    expect(events).toHaveLength(1);
    expect(events[0].vendor).toBe("anthropic");
    expect(events[0].source_ref).toBe("anth-evt-1");
    expect(events[0].quantity).toBe(1500);
    expect(events[0].cost_usd).toBe(0.0045);
  });

  it("throws on upstream error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const connector = new AnthropicConnector({
      apiKey: "test",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    await expect(
      connector.poll(new Date("2026-03-13T00:00:00.000Z"), new Date("2026-03-15T00:00:00.000Z"), {
        now: () => new Date("2026-03-15T00:00:00.000Z")
      })
    ).rejects.toThrow("Anthropic usage poll failed");
  });
});
