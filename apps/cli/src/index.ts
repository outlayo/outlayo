#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { CONNECTORS } from "./connectors.js";
import { mergeEnv, parseEnv, readEnvFile, writeEnvFile } from "./envfile.js";
import { runDoctor } from "./doctor.js";

function getCliArgs(): string[] {
  const args = process.argv.slice(2);
  if (args[0] === "--") {
    return args.slice(1);
  }
  return args;
}

function getArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) {
    return args[idx + 1];
  }
  return undefined;
}

function printHelp(): void {
  output.write(
    [
      "Outlayo CLI",
      "",
      "Usage:",
      "  outlayo init [--env .env]",
      "  outlayo doctor [--env .env]",
      "  outlayo --help"
    ].join("\n") + "\n"
  );
}

async function askYesNo(rl: readline.Interface, prompt: string, defaultYes = false): Promise<boolean> {
  const suffix = defaultYes ? " [Y/n]: " : " [y/N]: ";
  const answer = (await rl.question(prompt + suffix)).trim().toLowerCase();
  if (!answer) {
    return defaultYes;
  }
  return answer === "y" || answer === "yes";
}

async function runInit(): Promise<void> {
  const args = getCliArgs();
  const envPath = getArg(args, "--env") ?? ".env";
  const absolutePath = path.resolve(envPath);
  const existing = readEnvFile(absolutePath);
  const updates: Record<string, string> = {};

  const rl = readline.createInterface({ input, output });
  try {
    output.write(`\nOutlayo setup wizard\n`);
    output.write(`Writing configuration to ${absolutePath}\n\n`);

    const adminTokenDefault = existing.values.ADMIN_TOKEN || crypto.randomBytes(18).toString("hex");
    const adminTokenAnswer = (await rl.question(`ADMIN_TOKEN [${adminTokenDefault}]: `)).trim();
    updates.ADMIN_TOKEN = adminTokenAnswer || adminTokenDefault;

    for (const connector of CONNECTORS) {
      const currentlyEnabled = (existing.values[connector.enabledKey] ?? "false").toLowerCase() === "true";
      const enable = await askYesNo(rl, `Enable ${connector.label}?`, currentlyEnabled);
      updates[connector.enabledKey] = enable ? "true" : "false";
      if (!enable) {
        continue;
      }

      for (const key of connector.requiredKeys) {
        const current = existing.values[key] ?? "";
        const answer = (await rl.question(`${key}${current ? ` [${current}]` : ""}: `)).trim();
        updates[key] = answer || current;
      }
    }
  } finally {
    rl.close();
  }

  const merged = mergeEnv(existing, updates);
  writeEnvFile(absolutePath, merged);
  output.write(`\nSaved ${absolutePath}\n`);
  output.write(`Run: outlayo doctor --env ${envPath}\n`);
}

function runDoctorCommand(): void {
  const args = getCliArgs();
  const envPath = getArg(args, "--env") ?? ".env";
  const absolutePath = path.resolve(envPath);
  const content = readEnvFile(absolutePath);
  const result = runDoctor(content.values);
  output.write(`Checked ${absolutePath}\n`);
  output.write(`Enabled connectors: ${result.enabledConnectors.join(", ") || "none"}\n`);
  if (result.ok) {
    output.write("Doctor: OK\n");
    return;
  }
  output.write("Doctor: issues found\n");
  for (const issue of result.issues) {
    output.write(`- ${issue}\n`);
  }
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const args = getCliArgs();
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }
  if (command === "init") {
    await runInit();
    return;
  }
  if (command === "doctor") {
    runDoctorCommand();
    return;
  }
  printHelp();
  process.exitCode = 1;
}

void main();
