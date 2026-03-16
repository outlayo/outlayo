import type { Store } from "@outlayo/core";

export interface FreeTierStatus {
  api: string;
  limit: number;
  used: number;
  remaining: number;
  percentUsed: number;
  projectedMonthEnd: number;
  projectedBreach: boolean;
  projectedOverage: number;
}

function daysInMonthUTC(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

export async function computeFreeTierStatus(params: {
  store: Store;
  now: Date;
  limits: Record<string, number>;
}): Promise<FreeTierStatus[]> {
  const firstOfMonth = new Date(Date.UTC(params.now.getUTCFullYear(), params.now.getUTCMonth(), 1)).toISOString();
  const events = await params.store.getCostEvents({
    vendor: "gcp",
    metric: "requests",
    since: firstOfMonth,
    until: params.now.toISOString(),
    limit: 5000
  });

  const usageByApi = new Map<string, number>();
  for (const event of events) {
    usageByApi.set(event.service, (usageByApi.get(event.service) ?? 0) + event.quantity);
  }

  const elapsed = params.now.getUTCDate();
  const totalDays = daysInMonthUTC(params.now.getUTCFullYear(), params.now.getUTCMonth());

  return Object.entries(params.limits).map(([api, limit]) => {
    const used = usageByApi.get(api) ?? 0;
    const projected = elapsed > 0 ? (used / elapsed) * totalDays : 0;
    const remaining = Math.max(0, limit - used);
    const projectedOverage = Math.max(0, projected - limit);
    return {
      api,
      limit,
      used: Number(used.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      percentUsed: Number((limit > 0 ? (used / limit) * 100 : 0).toFixed(2)),
      projectedMonthEnd: Number(projected.toFixed(2)),
      projectedBreach: projected > limit,
      projectedOverage: Number(projectedOverage.toFixed(2))
    };
  });
}
