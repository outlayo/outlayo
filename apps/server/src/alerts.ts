import type { Store } from "@outlayo/core";
import { forecastMonthEnd } from "@outlayo/forecaster";

export interface BudgetAlerter {
  evaluate: (at: Date) => Promise<void>;
}

export interface FreeTierAlertStatus {
  api: string;
  limit: number;
  projectedMonthEnd: number;
  projectedBreach: boolean;
  projectedOverage: number;
}

export function createBudgetWebhookAlerter(params: {
  store: Store;
  budgetUsd: number;
  webhookUrl: string;
  cooldownHours: number;
  freeTierProvider?: (at: Date) => Promise<FreeTierAlertStatus[]>;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, "info" | "error">;
}): BudgetAlerter {
  const fetchImpl = params.fetchImpl ?? fetch;
  const logger = params.logger ?? console;
  const lastSentAt = new Map<string, Date>();

  const shouldSuppress = (key: string, at: Date): boolean => {
    const previous = lastSentAt.get(key);
    if (!previous) {
      return false;
    }
    const cooldownMs = params.cooldownHours * 60 * 60 * 1000;
    return at.getTime() - previous.getTime() < cooldownMs;
  };

  const sendWebhook = async (payload: Record<string, unknown>): Promise<void> => {
    const response = await fetchImpl(params.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Alert webhook failed: ${response.status}`);
    }
  };

  return {
    evaluate: async (at: Date) => {
      const summary = await params.store.getMtdSummary(at);
      const forecast = forecastMonthEnd(at, summary.daily);
      const projected = forecast.forecast_7d_avg_usd;

      if (projected > params.budgetUsd && !shouldSuppress("budget", at)) {
        await sendWebhook({
          alert_type: "budget",
          text: `Outlayo budget alert: forecast $${projected.toFixed(2)} exceeds budget $${params.budgetUsd.toFixed(2)}`,
          forecast_usd: projected,
          budget_usd: params.budgetUsd,
          over_by_usd: Number((projected - params.budgetUsd).toFixed(2)),
          at: at.toISOString()
        });
        lastSentAt.set("budget", at);
        logger.info("[alerts] budget breach webhook sent");
      }

      if (!params.freeTierProvider) {
        return;
      }

      const statuses = await params.freeTierProvider(at);
      for (const status of statuses) {
        if (!status.projectedBreach) {
          continue;
        }

        const key = `free-tier:${status.api}`;
        if (shouldSuppress(key, at)) {
          continue;
        }

        await sendWebhook({
          alert_type: "free_tier",
          text: `Outlayo free-tier alert (${status.api}): projected usage ${status.projectedMonthEnd.toFixed(2)} exceeds limit ${status.limit.toFixed(2)}`,
          api: status.api,
          free_tier_limit: status.limit,
          projected_usage: status.projectedMonthEnd,
          projected_overage: status.projectedOverage,
          at: at.toISOString()
        });
        lastSentAt.set(key, at);
        logger.info(`[alerts] free-tier breach webhook sent for ${status.api}`);
      }
    }
  };
}
