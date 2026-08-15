import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { postgresConnectionOptions } from "./connection.ts";
import { loadDatabaseEnv } from "./env.ts";

const { Pool } = pg;

const envValues = loadDatabaseEnv();
const connectionString = process.env.DATABASE_URL ?? envValues.DATABASE_URL;

export const pool = new Pool({
  ...postgresConnectionOptions(connectionString ?? "postgres://postgres:postgres@localhost:5432/vmou_rscit"),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 30_000)
});

export const db = drizzle(pool, { schema });

if (connectionString) {
  void pool.query("select 1").catch(() => undefined);
}

export function isDatabaseConfigured() {
  return Boolean(connectionString);
}

export function assertDatabaseConfigured() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env.local and set PostgreSQL connection.");
  }
}
