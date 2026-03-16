import { describe, expect, it } from "vitest";
import { forecastMonthEnd } from "./index.js";

describe("forecastMonthEnd", () => {
  it("uses 7-day average when enough data exists", () => {
    const now = new Date("2026-03-20T00:00:00.000Z");
    const daily = Array.from({ length: 10 }, (_, idx) => ({
      date: `2026-03-${String(idx + 1).padStart(2, "0")}`,
      vendor: "openai",
      spend_usd: 10 + idx
    }));

    const result = forecastMonthEnd(now, daily);
    expect(result.used_7d).toBe(true);
    expect(result.confidence).toBe("low");
    expect(result.forecast_7d_avg_usd).toBeGreaterThan(0);
  });

  it("falls back to MTD when fewer than 7 days exist", () => {
    const now = new Date("2026-03-03T00:00:00.000Z");
    const daily = [
      { date: "2026-03-01", vendor: "openai", spend_usd: 10 },
      { date: "2026-03-02", vendor: "openai", spend_usd: 20 }
    ];

    const result = forecastMonthEnd(now, daily);
    expect(result.used_7d).toBe(false);
    expect(result.forecast_7d_avg_usd).toBe(result.forecast_mtd_avg_usd);
  });
});
