import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface LoadDatabaseEnvOptions {
  cwd?: string;
  envPath?: string;
}

export function loadDatabaseEnv(options: LoadDatabaseEnvOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const envPath = options.envPath ?? path.join(cwd, ".env.local");

  const values: Record<string, string> = {};

  if (!existsSync(/*turbopackIgnore: true*/ envPath)) {
    return values;
  }

  for (const rawLine of readFileSync(/*turbopackIgnore: true*/ envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    values[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return values;
}
