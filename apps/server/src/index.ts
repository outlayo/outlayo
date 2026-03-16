import "dotenv/config";
import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import { buildStore } from "./store.js";
import { buildConnectorRegistry } from "./registry.js";
import { createApp } from "./app.js";
import { startScheduler } from "./scheduler.js";
import { createBudgetWebhookAlerter } from "./alerts.js";
import { computeFreeTierStatus } from "./freeTier.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = buildStore(config);
  await store.migrate();

  const connectors = buildConnectorRegistry(config);
  const gcpFreeTierLimits = config.gcpFreeTierLimitsJson
    ? (JSON.parse(config.gcpFreeTierLimitsJson) as Record<string, number>)
    : undefined;
  const alerter =
    config.monthlyBudgetUsd && config.alertWebhookUrl
      ? createBudgetWebhookAlerter({
          store,
          budgetUsd: config.monthlyBudgetUsd,
          webhookUrl: config.alertWebhookUrl,
          cooldownHours: config.alertCooldownHours,
          freeTierProvider: gcpFreeTierLimits
            ? (at) => computeFreeTierStatus({ store, now: at, limits: gcpFreeTierLimits })
            : undefined
        })
      : null;

  const scheduler = startScheduler({
    intervalMinutes: config.pollIntervalMinutes,
    connectors,
    store,
    afterTick: alerter ? (at) => alerter.evaluate(at) : undefined
  });

  const app = createApp({
    store,
    connectors,
    adminHeaderName: config.adminHeaderName,
    adminToken: config.adminToken,
    alertingEnabled: Boolean(config.monthlyBudgetUsd && config.alertWebhookUrl),
    gcpFreeTierLimits
  });

  const server = createServer(app);
  server.listen(config.port, config.host, () => {
    const backend = config.dbBackend === "postgres" ? `postgres (${config.postgresUrl ? "configured" : "missing"})` : `sqlite (${config.sqlitePath})`;
    console.info(`outlayo listening on http://${config.host}:${config.port}`);
    console.info(`[startup] db backend: ${backend}`);
    console.info(`[startup] connectors: ${connectors.map((c) => c.name()).join(", ") || "none"}`);
    console.info(`[startup] budget alerting: ${alerter ? "enabled" : "disabled"}`);
  });

  const shutdown = async () => {
    scheduler.stop();
    server.close();
    await store.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`fatal startup error: ${message}`);
  process.exit(1);
});
