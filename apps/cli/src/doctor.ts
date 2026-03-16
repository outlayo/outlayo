import { CONNECTORS } from "./connectors.js";

export interface DoctorResult {
  ok: boolean;
  issues: string[];
  enabledConnectors: string[];
}

export function runDoctor(values: Record<string, string>): DoctorResult {
  const issues: string[] = [];
  const enabledConnectors: string[] = [];

  for (const connector of CONNECTORS) {
    const enabled = (values[connector.enabledKey] ?? "false").toLowerCase() === "true";
    if (!enabled) {
      continue;
    }
    enabledConnectors.push(connector.label);
    for (const key of connector.requiredKeys) {
      if (!(values[key] ?? "").trim()) {
        issues.push(`${connector.label}: missing ${key}`);
      }
    }
  }

  if (enabledConnectors.length === 0) {
    issues.push("No connectors are enabled");
  }

  return { ok: issues.length === 0, issues, enabledConnectors };
}
