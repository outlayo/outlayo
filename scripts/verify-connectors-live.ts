import "dotenv/config";
import { loadConfig } from "../apps/server/src/config.js";
import { buildConnectorRegistry } from "../apps/server/src/registry.js";

function sanitize(message: string): string {
  return message
    .replace(/(access_token=)[^&\s]+/gi, "$1REDACTED")
    .replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, "$1REDACTED")
    .replace(/(token=)[^&\s]+/gi, "$1REDACTED");
}

async function main(): Promise<void> {
  const config = loadConfig();
  const connectors = buildConnectorRegistry(config);
  const only = process.env.VERIFY_ONLY
    ? new Set(
        process.env.VERIFY_ONLY.split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      )
    : null;

  const selected = only ? connectors.filter((c) => only.has(c.name())) : connectors;
  console.log(`live_verify connectors=${selected.map((c) => c.name()).join(",") || "none"}`);

  const until = new Date();
  const since = new Date(until.getTime() - 30 * 60 * 1000);

  let hasFailure = false;
  for (const connector of selected) {
    try {
      if (typeof connector.healthcheck === "function") {
        await connector.healthcheck();
      }
      const events = await connector.poll(since, until, { now: () => new Date() });
      console.log(`${connector.name()}: OK events=${events.length}`);
    } catch (error) {
      hasFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      const causeCode =
        error && typeof error === "object" && "cause" in error
          ? (error as { cause?: { code?: string } }).cause?.code
          : undefined;
      const suffix = causeCode ? ` [cause=${causeCode}]` : "";
      console.log(`${connector.name()}: FAIL ${sanitize(message)}${suffix}`);
    }
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

void main();
