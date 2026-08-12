import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";
import { isRdsConnection, normalizeConnectionString } from "./src/lib/db/connection.ts";

function readEnvFile(envPath: string) {
  if (!existsSync(envPath)) return {} as Record<string, string>;

  const values: Record<string, string> = {};
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

export function resolveDbCredentials() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, ".env.local");
  const envValues = readEnvFile(envPath);
  const databaseUrl = process.env.DATABASE_URL ?? envValues.DATABASE_URL ?? "";

  return {
    url: normalizeConnectionString(databaseUrl) ?? "",
    ssl: isRdsConnection(databaseUrl) ? { rejectUnauthorized: false } : undefined
  };
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: resolveDbCredentials()
});
