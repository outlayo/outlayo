import type { ConfidenceSummary, ConnectorHealth, SpendSummary, UsageSummaryRow } from "@outlayo/core";
import type { ForecastResult } from "@outlayo/forecaster";
import type { FreeTierStatus } from "./freeTier.js";

function dollars(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatUtcCompact(value: string | null): string {
  if (!value) {
    return "never";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function formatRelativeAge(value: string | null, reference: Date): string {
  if (!value) {
    return "never";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const diffMs = Math.max(0, reference.getTime() - parsed.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function icon(name: "spend" | "forecast" | "watch" | "trend" | "drivers" | "health" | "limits" | "usage"): string {
  const common = 'width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  switch (name) {
    case "spend":
      return `<svg ${common}><path d="M8 1.5v13"/><path d="M10.75 4.25c0-.97-1.23-1.75-2.75-1.75S5.25 3.28 5.25 4.25 6.48 6 8 6s2.75.78 2.75 1.75S9.52 9.5 8 9.5s-2.75.78-2.75 1.75S6.48 13 8 13s2.75-.78 2.75-1.75"/></svg>`;
    case "forecast":
      return `<svg ${common}><path d="M2 11.5 5.5 8l2.5 2.5L14 4.5"/><path d="M10.5 4.5H14V8"/></svg>`;
    case "watch":
      return `<svg ${common}><path d="M8 2.5c3.25 0 5.45 2.18 6.2 5.08a.9.9 0 0 1 0 .84C13.45 11.32 11.25 13.5 8 13.5S2.55 11.32 1.8 8.42a.9.9 0 0 1 0-.84C2.55 4.68 4.75 2.5 8 2.5Z"/><circle cx="8" cy="8" r="2"/></svg>`;
    case "trend":
      return `<svg ${common}><path d="M2 11.5h12"/><path d="M3 10l3-3 2 1.75L13 4.5"/></svg>`;
    case "drivers":
      return `<svg ${common}><rect x="2.5" y="8.5" width="2.5" height="5" rx=".6"/><rect x="6.75" y="5.5" width="2.5" height="8" rx=".6"/><rect x="11" y="3" width="2.5" height="10.5" rx=".6"/></svg>`;
    case "health":
      return `<svg ${common}><path d="M2.5 8h2l1.2-2.2L8 10.5l1.3-2.3h4.2"/><path d="M8 14c3.25-2.05 5.5-4.45 5.5-7.2A3.05 3.05 0 0 0 10.45 3.8c-.96 0-1.88.43-2.45 1.2-.57-.77-1.49-1.2-2.45-1.2A3.05 3.05 0 0 0 2.5 6.8C2.5 9.55 4.75 11.95 8 14Z"/></svg>`;
    case "limits":
      return `<svg ${common}><path d="M8 2.25 13.25 4.5v3.37c0 2.74-1.58 4.88-5.25 5.88-3.67-1-5.25-3.14-5.25-5.88V4.5L8 2.25Z"/><path d="M8 5v3.25"/><circle cx="8" cy="10.75" r=".75" fill="currentColor" stroke="none"/></svg>`;
    case "usage":
      return `<svg ${common}><path d="M3 12.5V6.25"/><path d="M8 12.5V3.5"/><path d="M13 12.5V8.5"/></svg>`;
  }
}

export function renderDashboard(params: {
  summary: SpendSummary;
  usageSummary: UsageSummaryRow[];
  confidenceSummary: ConfidenceSummary;
  freeTierSummary: FreeTierStatus[];
  forecast: ForecastResult;
  connectorHealth: ConnectorHealth[];
  generatedAt: string;
  showZeroDays?: boolean;
  chart?: "rows" | "bars" | "line" | "area";
}): string {
  const totalSpend = Math.max(params.summary.mtd_total_usd, 0.01);
  const vendorRows = params.summary.by_vendor
    .map((v) => {
      const share = Math.round((v.spend_usd / totalSpend) * 100);
      return `<div style="border-radius:14px;border:1px solid rgba(18,38,58,0.08);background:var(--surface);padding:12px 14px">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><span style="font-weight:700;text-transform:capitalize;color:var(--ink)">${v.vendor}</span><span style="font-size:0.78rem;color:var(--muted)">${share}% of MTD</span></div>
  <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:10px"><div style="height:8px;flex:1;border-radius:999px;background:rgba(18,38,58,0.08);overflow:hidden"><div style="height:100%;width:${Math.max(6, share)}%;background:linear-gradient(90deg, #0f766e, #0ea5a4);border-radius:999px"></div></div><span style="font-weight:700;color:var(--accent-strong)">${dollars(v.spend_usd)}</span></div>
</div>`;
    })
    .join("\n");

  const groupedByDate = new Map<string, { total: number; vendors: Map<string, number> }>();
  for (const row of params.summary.daily) {
    const existing = groupedByDate.get(row.date) ?? { total: 0, vendors: new Map<string, number>() };
    existing.total += row.spend_usd;
    existing.vendors.set(row.vendor, (existing.vendors.get(row.vendor) ?? 0) + row.spend_usd);
    groupedByDate.set(row.date, existing);
  }

  const generated = new Date(params.generatedAt);
  const generatedUtc = Number.isNaN(generated.getTime()) ? new Date() : generated;
  const monthStart = new Date(Date.UTC(generatedUtc.getUTCFullYear(), generatedUtc.getUTCMonth(), 1));
  const orderedDays: Array<[string, { total: number; vendors: Map<string, number> }]> = [];
  for (
    const cursor = new Date(monthStart);
    cursor <= generatedUtc;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const key = cursor.toISOString().slice(0, 10);
    orderedDays.push([key, groupedByDate.get(key) ?? { total: 0, vendors: new Map<string, number>() }]);
  }

  const nonZeroDays = orderedDays.filter(([, day]) => day.total > 0);
  const showZeroDays = Boolean(params.showZeroDays);
  const visibleDays = showZeroDays || nonZeroDays.length === 0 ? orderedDays : nonZeroDays;
  const hiddenZeroDayCount = orderedDays.length - visibleDays.length;
  const maxDay = Math.max(1, ...visibleDays.map(([, d]) => d.total));
  const palette = ["bg-cyan-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-emerald-500"];
  const allVendors = [
    ...new Set([...params.summary.daily.map((r) => r.vendor), ...params.summary.by_vendor.map((v) => v.vendor)].sort())
  ];
  const vendorColors = new Map(allVendors.map((vendor, idx) => [vendor, palette[idx % palette.length]]));

  const vendorLegend = allVendors
    .map(
      (vendor, idx) =>
        `<span class="dash-chip"><span class="dash-legend-dot ${palette[idx % palette.length]}"></span>${vendor}</span>`
    )
    .join(" ");

  const sevenDaySpend = visibleDays.slice(-7).reduce((acc, [, day]) => acc + day.total, 0);
  const topVendor =
    params.summary.by_vendor.length > 0
      ? params.summary.by_vendor.reduce((max, row) => (row.spend_usd > max.spend_usd ? row : max))
      : null;
  const latestSuccess = params.connectorHealth
    .map((health) => health.last_success)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  const updatedLabel = `${formatRelativeAge(params.generatedAt, generatedUtc)} · ${formatUtcCompact(params.generatedAt)}`;
  const latestSuccessLabel = latestSuccess ? `${formatRelativeAge(latestSuccess, generatedUtc)} · ${formatUtcCompact(latestSuccess)}` : "never";
  const topVendorShare = topVendor ? Math.round((topVendor.spend_usd / totalSpend) * 100) : 0;
  const watchLevel =
    params.forecast.forecast_7d_avg_usd >= params.summary.mtd_total_usd * 1.8
      ? "Elevated"
      : params.forecast.forecast_7d_avg_usd >= params.summary.mtd_total_usd * 1.35
        ? "Watch"
        : "Stable";
  const watchNote =
    watchLevel === "Elevated"
      ? "Projected finish is materially above the current month-to-date pace."
      : watchLevel === "Watch"
        ? "Projection is climbing faster than the current run-rate."
        : "Current trend looks controlled relative to month-to-date pace.";

  const kpiChips = [
    `<span class="dash-chip"><strong>7d spend</strong>${dollars(sevenDaySpend)}</span>`,
    `<span class="dash-chip"><strong>Top vendor</strong>${topVendor ? `${topVendor.vendor} ${dollars(topVendor.spend_usd)}` : "none"}</span>`,
    `<span class="dash-chip"><strong>Last successful sync</strong>${latestSuccessLabel}</span>`
  ].join(" ");

  const zeroToggle = hiddenZeroDayCount > 0 || showZeroDays;
  const chart = params.chart ?? "rows";
  const chartQuery = chart === "rows" ? "" : `chart=${chart}`;
  const toggleHref = showZeroDays
    ? chartQuery ? `/?${chartQuery}` : "/"
    : chartQuery
      ? `/?showZeroDays=1&${chartQuery}`
      : "/?showZeroDays=1";
  const toggleLabel = showZeroDays ? "Hide zero days" : `Show zero days (${hiddenZeroDayCount} hidden)`;

  const usageRows = params.usageSummary
    .map(
      (row) =>
        `<tr><td style="font-weight:600;text-transform:capitalize">${row.vendor}</td><td class="muted">${row.metric}</td><td>${row.quantity.toLocaleString()}</td></tr>`
    )
    .join("\n");

  const freeTierRows = params.freeTierSummary
    .map(
      (row) =>
        `<tr><td style="font-weight:600">${row.api}</td><td class="muted">${row.used.toLocaleString()} / ${row.limit.toLocaleString()}</td><td>${row.percentUsed.toFixed(1)}%</td><td class="${row.projectedBreach ? "err" : "ok"}">${row.projectedBreach ? `breach +${row.projectedOverage.toLocaleString()}` : "within free tier"}</td></tr>`
    )
    .join("\n");

  const confidenceRows = params.confidenceSummary.by_confidence
    .map(
      (row) =>
        `<tr><td style="font-weight:600;text-transform:capitalize">${row.confidence}</td><td class="muted">${row.event_count}</td><td>${dollars(row.cost_usd)}</td></tr>`
    )
    .join("\n");

  const dailyRows = visibleDays
    .map(([date, day]) => {
      const segments = [...day.vendors.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([vendor, spend]) => {
          const pct = day.total > 0 ? Math.max(0.5, (spend / day.total) * 100) : 0;
          return `<div title="${vendor}: ${dollars(spend)}" class="h-3 ${vendorColors.get(vendor) ?? "bg-slate-400"}" style="width:${pct}%;min-width:${spend > 0 ? 4 : 0}px"></div>`;
        })
        .join("");

      const width = day.total > 0 ? Math.max(8, Math.round((day.total / maxDay) * 100)) : 0;
      return `<div class="space-y-1">
  <div class="flex items-center justify-between text-sm"><span class="font-medium text-slate-700">${date}</span><span class="font-semibold text-slate-900">${dollars(day.total)}</span></div>
  <div class="w-full rounded-full bg-slate-200/70 overflow-hidden" style="height:12px">
    <div class="flex h-full" style="width:${width}%">${segments}</div>
  </div>
</div>`;
    })
    .join("\n");

  const chartLabels = visibleDays.map(([date]) => date);
  const totalSeries = visibleDays.map(([, day]) => Number(day.total.toFixed(2)));
  const vendorSeries = allVendors.map((vendor) => ({
    label: vendor,
    data: visibleDays.map(([, day]) => Number((day.vendors.get(vendor) ?? 0).toFixed(2)))
  }));
  const chartPayload = JSON.stringify({
    labels: chartLabels,
    totals: totalSeries,
    vendors: vendorSeries,
    mode: chart
  }).replace(/</g, "\\u003c");

  const chartCanvas = (mode: "bars" | "line" | "area", label: string) => `<div data-chart-mode="${mode}" class="mt-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
    <div class="dash-chart-frame">
      <canvas id="daily-chart-${mode}" data-chart-config='${chartPayload}' data-chart-kind="${mode}" role="img" aria-label="${label}"></canvas>
    </div>
    <div class="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">${visibleDays.map(([date, day]) => `<span>${date} ${dollars(day.total)}</span>`).join("")}</div>
  </div>`;

  const dailyBars = chartCanvas("bars", "Daily spend trend bars");

  const lineChart = chartCanvas("line", "Daily spend trend line");

  const areaChart = chartCanvas("area", "Daily spend trend area");

  const dailyChart =
    chart === "bars"
      ? dailyBars
      : chart === "line"
        ? lineChart
        : chart === "area"
          ? areaChart
          : `<div data-chart-mode="rows" class="mt-4 space-y-3">${dailyRows || "<p class='text-sm text-slate-500'>No daily data yet</p>"}</div>`;

  const chartModes = [
    ["rows", "Rows"],
    ["bars", "Bars"],
    ["line", "Line"],
    ["area", "Area"]
  ] as const;
  const chartModeLinks = chartModes
    .map(([value, label]) => {
      const params = new URLSearchParams();
      if (showZeroDays) {
        params.set("showZeroDays", "1");
      }
      if (value !== "rows") {
        params.set("chart", value);
      }
      const href = params.size > 0 ? `/?${params.toString()}` : "/";
      const active = chart === value;
      return `<a href="${href}" aria-current="${active ? "page" : "false"}" class="dash-mode-link" data-mode="${value}">${label}</a>`;
    })
    .join(" ");

  const dailyTitle =
    chart === "bars"
      ? "Daily spend (bars)"
      : chart === "line"
        ? "Daily spend (line)"
        : chart === "area"
          ? "Daily spend (area)"
          : "Daily spend (stacked by vendor)";

  const connectorRows = params.connectorHealth
    .map(
      (h) => {
        const healthy = !h.last_error;
        const label = h.connector === "budget-alert" ? "Budget Alerts" : h.connector;
        const freshness = h.last_success
          ? `${formatRelativeAge(h.last_success, generatedUtc)} · ${formatUtcCompact(h.last_success)}`
          : "never";
        const status = healthy ? "Healthy" : "Needs attention";
        return `<tr><td style="font-weight:600;text-transform:capitalize">${label}</td><td class="${healthy ? "ok" : "err"}">${status}</td><td class="muted">${freshness}</td></tr>`;
      }
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Outlayo Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="/static/styles.css" />
  <style>
    :root {
      --ink: #12263a;
      --muted: #50657a;
      --surface: #fffdf8;
      --sand: #f4efe3;
      --accent: #0f766e;
      --accent-strong: #0d5f5a;
      --ring: rgba(15, 118, 110, 0.24);
      --shadow: 0 18px 45px rgba(18, 38, 58, 0.14);
      --shadow-sm: 0 8px 24px rgba(18, 38, 58, 0.08);
      --font-body: "Space Grotesk", "Trebuchet MS", "Segoe UI", sans-serif;
      --font-display: "Fraunces", Georgia, serif;
    }

    body {
      font-family: var(--font-body);
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 18%, rgba(15, 118, 110, 0.14), transparent 42%),
        radial-gradient(circle at 88% 24%, rgba(14, 116, 144, 0.12), transparent 36%),
        linear-gradient(160deg, #fffdf8 0%, #f6f1e6 48%, #e9f8f4 100%);
      min-height: 100vh;
    }

    .dash-shell {
      max-width: 1100px;
      margin: 0 auto;
      padding: 22px 18px 40px;
    }

    .fade-up {
      animation: fadeUp 500ms ease-out both;
    }
    .fade-up.delay-1 { animation-delay: 120ms; }
    .fade-up.delay-2 { animation-delay: 220ms; }
    .fade-up.delay-3 { animation-delay: 300ms; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dash-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(18, 38, 58, 0.12);
      background: rgba(255, 255, 255, 0.78);
      backdrop-filter: blur(8px);
      border-radius: 999px;
      padding: 10px 16px;
      box-shadow: 0 10px 30px rgba(18, 38, 58, 0.07);
      margin-bottom: 20px;
    }

    .dash-brand {
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.02em;
      color: var(--ink);
    }

    .dash-eyebrow {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.17em;
      color: var(--accent-strong);
    }

    .dash-badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--ring);
      background: rgba(255, 255, 255, 0.82);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--accent-strong);
    }

    .dash-card {
      border-radius: 20px;
      border: 1px solid rgba(18, 38, 58, 0.1);
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--shadow-sm);
      padding: 20px;
    }

    .dash-kpi-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.13em;
      color: var(--muted);
    }

    .dash-kpi-value {
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 2.8rem);
      font-weight: 700;
      line-height: 1.05;
      color: var(--ink);
      margin-top: 10px;
    }

    .dash-kpi-value.accent {
      color: var(--accent);
    }

    .dash-kpi-sub {
      margin-top: 6px;
      font-size: 0.78rem;
      color: var(--muted);
    }

    .dash-section-title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--ink);
    }

    .dash-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-strong);
      flex-shrink: 0;
    }

    .dash-section-sub {
      margin-top: 4px;
      font-size: 0.85rem;
      color: var(--muted);
    }

    .dash-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      border: 1px solid rgba(18, 38, 58, 0.12);
      background: var(--surface);
      padding: 4px 12px;
      font-size: 0.78rem;
      color: var(--ink);
    }

    .dash-chip strong {
      font-weight: 700;
      color: var(--ink);
    }

    .dash-mode-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      border: 1px solid rgba(18, 38, 58, 0.14);
      background: rgba(255, 255, 255, 0.84);
      padding: 4px 12px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--muted);
      text-decoration: none;
      transition: color 140ms ease, border-color 140ms ease;
    }

    .dash-mode-link[aria-current="page"] {
      border-color: var(--ring);
      background: rgba(15, 118, 110, 0.08);
      color: var(--accent-strong);
    }

    .dash-mode-link:hover {
      color: var(--ink);
    }

    .dash-mode-link::before {
      content: "";
      width: 14px;
      height: 14px;
      display: inline-block;
      background-color: currentColor;
      mask-repeat: no-repeat;
      -webkit-mask-repeat: no-repeat;
      mask-position: center;
      -webkit-mask-position: center;
      mask-size: 14px 14px;
      -webkit-mask-size: 14px 14px;
      opacity: 0.85;
    }

    .dash-mode-link[data-mode="rows"]::before {
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2z'/%3E%3C/svg%3E");
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2z'/%3E%3C/svg%3E");
    }

    .dash-mode-link[data-mode="bars"]::before {
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M2 9h2v5H2zm5-3h2v8H7zm5-4h2v12h-2z'/%3E%3C/svg%3E");
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M2 9h2v5H2zm5-3h2v8H7zm5-4h2v12h-2z'/%3E%3C/svg%3E");
    }

    .dash-mode-link[data-mode="line"]::before {
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='black' stroke-width='2' d='M2 11l4-4 3 2 5-5'/%3E%3C/svg%3E");
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='black' stroke-width='2' d='M2 11l4-4 3 2 5-5'/%3E%3C/svg%3E");
    }

    .dash-mode-link[data-mode="area"]::before {
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M2 12V9l3-3 3 2 4-4 2 2v6z'/%3E%3C/svg%3E");
      -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M2 12V9l3-3 3 2 4-4 2 2v6z'/%3E%3C/svg%3E");
    }

    .dash-toggle {
      font-size: 0.78rem;
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }

    .dash-toggle:hover {
      color: var(--accent-strong);
    }

    .dash-legend-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      flex-shrink: 0;
    }

    .dash-table {
      width: 100%;
      font-size: 0.875rem;
      border-collapse: collapse;
    }

    .dash-table th {
      padding-bottom: 8px;
      padding-right: 10px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      text-align: left;
    }

    .dash-table td {
      padding: 10px 10px 10px 0;
      border-top: 1px solid rgba(18, 38, 58, 0.07);
      color: var(--ink);
    }

    .dash-table td.muted { color: var(--muted); }
    .dash-table td.ok { color: #059669; font-weight: 600; }
    .dash-table td.err { color: #dc2626; }
    .dash-table td.warn { color: #d97706; }

    .dash-rule {
      height: 1px;
      background: rgba(18, 38, 58, 0.08);
      margin: 18px 0;
    }

    .dash-note {
      font-size: 0.8rem;
      color: var(--muted);
    }

    .dash-status-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(15, 118, 110, 0.08);
      color: var(--accent-strong);
    }

    .dash-chart-frame {
      position: relative;
      min-height: 260px;
      padding: 8px 4px 0;
    }

    .dash-chart-frame canvas {
      width: 100% !important;
      height: 250px !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .fade-up { animation: none; }
    }

    @media (max-width: 640px) {
      .dash-shell { padding: 14px 12px 28px; }
      .dash-topbar { border-radius: 18px; padding: 10px 14px; }
    }
  </style>
</head>
<body>
<main class="dash-shell">
  <header class="dash-topbar fade-up">
    <div>
      <div class="dash-brand">Outlayo</div>
      <div class="dash-eyebrow" style="margin-top:2px">Cost Pulse</div>
      <div class="dash-note" style="margin-top:6px">Spend visibility across active vendors · Updated ${updatedLabel}</div>
    </div>
    <div class="dash-badge">
      7-day forecast ${params.forecast.used_7d ? "active" : "fallback to MTD"}
    </div>
  </header>

  <section class="grid gap-4 md:grid-cols-3 fade-up delay-1">
    <article class="dash-card">
      <p class="dash-kpi-label"><span class="dash-icon">${icon("spend")}</span>MTD Spend</p>
      <p class="dash-kpi-value">${dollars(params.summary.mtd_total_usd)}</p>
    </article>
    <article class="dash-card">
      <p class="dash-kpi-label"><span class="dash-icon">${icon("forecast")}</span>Projected Month-End</p>
      <p class="dash-kpi-value accent">${dollars(params.forecast.forecast_7d_avg_usd)}</p>
      <p class="dash-kpi-sub">MTD line: ${dollars(params.forecast.forecast_mtd_avg_usd)} · confidence: low</p>
    </article>
    <article class="dash-card">
      <p class="dash-kpi-label"><span class="dash-icon">${icon("watch")}</span>Watch Level</p>
      <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span class="dash-status-pill">${watchLevel}</span>
        <span style="font-size:0.82rem;color:var(--muted)">${topVendor ? `${topVendor.vendor} drives ${topVendorShare}%` : "No dominant driver yet"}</span>
      </div>
      <p class="dash-kpi-sub" style="margin-top:14px">${watchNote}</p>
    </article>
  </section>

  <section class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)] fade-up delay-2">
    <article class="dash-card lg:col-span-2">
      <h2 class="dash-section-title"><span class="dash-icon">${icon("trend")}</span>${dailyTitle}</h2>
      <p class="dash-section-sub">Follow the trend first, then compare drivers and decide whether the month still looks healthy.</p>
      <div class="mt-3 flex flex-wrap gap-2">${kpiChips}</div>
      <div class="mt-2 flex flex-wrap gap-2">${chartModeLinks}</div>
      <div class="mt-2 flex flex-wrap items-center gap-2">${vendorLegend || ""}</div>
      ${
        zeroToggle
          ? `<div class="mt-2"><a class="dash-toggle" href="${toggleHref}">${toggleLabel}</a></div>`
          : ""
      }
      ${dailyChart}
    </article>
    <article class="dash-card">
      <h2 class="dash-section-title"><span class="dash-icon">${icon("drivers")}</span>Cost drivers</h2>
      <p class="dash-section-sub">Which vendors are shaping the month right now.</p>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">${vendorRows || "<p style='font-size:0.875rem;color:var(--muted)'>No spend yet</p>"}</div>
    </article>
  </section>

  <section class="mt-4 grid gap-4 lg:grid-cols-2 fade-up delay-3">
    <article class="dash-card">
      <h2 class="dash-section-title"><span class="dash-icon">${icon("health")}</span>Data health</h2>
      <p class="dash-section-sub">Can you trust the numbers and the sync state behind them?</p>
      <div style="margin-top:16px">
        <div class="dash-kpi-label">Connector health</div>
        <div class="mt-3 overflow-x-auto">
          <table class="dash-table">
            <thead>
              <tr><th>Connector</th><th>Status</th><th>Freshness</th></tr>
            </thead>
            <tbody>${connectorRows || "<tr><td class='muted' colspan='3' style='padding-top:12px'>No connector runs yet</td></tr>"}</tbody>
          </table>
        </div>
        <div class="dash-rule"></div>
        <div class="dash-kpi-label">Signal confidence</div>
        <p class="dash-note" style="margin-top:6px">Distribution of event confidence labels across current month data.</p>
        <div class="mt-3 overflow-x-auto">
          <table class="dash-table">
            <thead>
              <tr><th>Confidence</th><th>Events</th><th>Cost</th></tr>
            </thead>
            <tbody>${confidenceRows || "<tr><td class='muted' colspan='3' style='padding-top:12px'>No confidence data yet</td></tr>"}</tbody>
          </table>
        </div>
      </div>
    </article>

    <article class="dash-card">
      <h2 class="dash-section-title"><span class="dash-icon">${icon("limits")}</span>Limits and thresholds</h2>
      <p class="dash-section-sub">Watch vendor free tiers, quota pressure, and breach risk in one place.</p>
      <div class="mt-4 overflow-x-auto">
        <table class="dash-table">
          <thead>
            <tr><th>API</th><th>Used / Limit</th><th>Used %</th><th>Projection</th></tr>
          </thead>
          <tbody>${freeTierRows || "<tr><td class='muted' colspan='4' style='padding-top:12px'>No free-tier data configured</td></tr>"}</tbody>
        </table>
      </div>
    </article>
  </section>

  <section class="mt-4 dash-card fade-up delay-3">
    <h2 class="dash-section-title"><span class="dash-icon">${icon("usage")}</span>Usage details</h2>
    <p class="dash-section-sub">Lower-level usage grouped by vendor and metric for operators who need the raw supporting detail.</p>
    <div class="mt-4 overflow-x-auto">
      <table class="dash-table">
        <thead>
          <tr><th>Vendor</th><th>Metric</th><th>MTD Quantity</th></tr>
        </thead>
        <tbody>${usageRows || "<tr><td class='muted' colspan='3' style='padding-top:12px'>No usage data yet</td></tr>"}</tbody>
      </table>
    </div>
  </section>
</main>
<script>
  window.addEventListener("load", () => {
    const ChartCtor = globalThis.Chart;
    if (!ChartCtor) {
      return;
    }

    const colors = ["#06b6d4", "#f59e0b", "#f43f5e", "#8b5cf6", "#10b981"];
    const canvases = document.querySelectorAll("canvas[data-chart-config]");

    canvases.forEach((canvas) => {
      const raw = canvas.getAttribute("data-chart-config");
      const kind = canvas.getAttribute("data-chart-kind");
      if (!raw || !kind || canvas.dataset.chartReady === "1") {
        return;
      }
      canvas.dataset.chartReady = "1";

      const payload = JSON.parse(raw);
      const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: {
            display: kind === "bars",
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, color: "#50657a", padding: 18 }
          },
          tooltip: {
            backgroundColor: "rgba(18, 38, 58, 0.92)",
            titleColor: "#fffdf8",
            bodyColor: "#fffdf8",
            padding: 10,
            cornerRadius: 10,
            displayColors: kind === "bars"
          }
        },
        scales: {
          x: {
            stacked: kind === "bars",
            grid: { display: false },
            ticks: { color: "#50657a", maxRotation: 0, autoSkip: true }
          },
          y: {
            stacked: kind === "bars",
            beginAtZero: true,
            border: { display: false },
            grid: { color: "rgba(18, 38, 58, 0.08)" },
            ticks: {
              color: "#50657a",
              callback: (value) => '$' + Number(value).toFixed(0)
            }
          }
        }
      };

      const config =
        kind === "bars"
          ? {
              type: "bar",
              data: {
                labels: payload.labels,
                datasets: payload.vendors.map((dataset, index) => ({
                  label: dataset.label,
                  data: dataset.data,
                  backgroundColor: colors[index % colors.length],
                  borderRadius: 6,
                  borderSkipped: false,
                  barThickness: 18,
                  maxBarThickness: 22
                }))
              },
              options: baseOptions
            }
          : {
              type: "line",
              data: {
                labels: payload.labels,
                datasets: [
                  {
                    label: "Daily spend",
                    data: payload.totals,
                    borderColor: "#0f766e",
                    backgroundColor: kind === "area" ? "rgba(15, 118, 110, 0.18)" : "rgba(15, 118, 110, 0.04)",
                    fill: kind === "area",
                    tension: 0.35,
                    pointRadius: 3,
                    pointHoverRadius: 4,
                    pointBackgroundColor: "#0f766e",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    borderWidth: 3
                  }
                ]
              },
              options: {
                ...baseOptions,
                plugins: {
                  ...baseOptions.plugins,
                  legend: { display: false }
                }
              }
            };

      new ChartCtor(canvas, config);
    });
  });
</script>
</body>
</html>`;
}
