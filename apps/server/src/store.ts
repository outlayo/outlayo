import type { AppConfig, Store } from "@outlayo/core";
import { SQLiteStore } from "@outlayo/store-sqlite";
import { PostgresStore } from "@outlayo/store-postgres";

export function buildStore(config: AppConfig): Store {
  if (config.dbBackend === "postgres") {
    if (!config.postgresUrl) {
      throw new Error("POSTGRES_URL missing for postgres backend");
    }
    try {
      new URL(config.postgresUrl);
    } catch {
      throw new Error("POSTGRES_URL is invalid. Expected a full postgres connection URL.");
    }
    return new PostgresStore(config.postgresUrl);
  }
  return new SQLiteStore(config.sqlitePath);
}
