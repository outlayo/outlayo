import type { DailySpend } from "@outlayo/core";

export interface ForecastResult {
  forecast_mtd_avg_usd: number;
  forecast_7d_avg_usd: number;
  used_7d: boolean;
  confidence: "low";
}

function daysInMonthUTC(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

export function forecastMonthEnd(now: Date, daily: DailySpend[]): ForecastResult {
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const totalDays = daysInMonthUTC(year, month);
  const elapsedDays = now.getUTCDate();

  const totalsByDay = new Map<string, number>();
  for (const row of daily) {
    totalsByDay.set(row.date, (totalsByDay.get(row.date) ?? 0) + row.spend_usd);
  }

  const ordered = [...totalsByDay.entries()]
    .map(([date, spend]) => ({ date, spend }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const mtdTotal = ordered.reduce((sum, d) => sum + d.spend, 0);
  const mtdAvg = elapsedDays > 0 ? mtdTotal / elapsedDays : 0;
  const forecastMtd = mtdAvg * totalDays;

  const last7 = ordered.slice(-7);
  const has7d = last7.length >= 7;
  const avg7 = has7d ? last7.reduce((sum, d) => sum + d.spend, 0) / 7 : mtdAvg;
  const forecast7 = avg7 * totalDays;

  return {
    forecast_mtd_avg_usd: Number(forecastMtd.toFixed(2)),
    forecast_7d_avg_usd: Number(forecast7.toFixed(2)),
    used_7d: has7d,
    confidence: "low"
  };
}
