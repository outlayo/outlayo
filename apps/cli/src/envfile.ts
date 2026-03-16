import fs from "node:fs";

export interface EnvData {
  order: string[];
  values: Record<string, string>;
}

export function parseEnv(content: string): EnvData {
  const order: string[] = [];
  const values: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = line.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in values)) {
      order.push(key);
    }
    values[key] = value;
  }
  return { order, values };
}

export function readEnvFile(filePath: string): EnvData {
  if (!fs.existsSync(filePath)) {
    return { order: [], values: {} };
  }
  const content = fs.readFileSync(filePath, "utf8");
  return parseEnv(content);
}

export function mergeEnv(existing: EnvData, updates: Record<string, string>): EnvData {
  const order = [...existing.order];
  const values = { ...existing.values };
  for (const [key, value] of Object.entries(updates)) {
    if (!order.includes(key)) {
      order.push(key);
    }
    values[key] = value;
  }
  return { order, values };
}

export function serializeEnv(data: EnvData): string {
  return `${data.order.map((key) => `${key}=${data.values[key] ?? ""}`).join("\n")}\n`;
}

export function writeEnvFile(filePath: string, data: EnvData): void {
  fs.writeFileSync(filePath, serializeEnv(data), "utf8");
}
