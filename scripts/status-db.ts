import pg from "pg";
import { postgresConnectionOptions } from "../src/lib/db/connection.ts";
import { loadDatabaseEnv } from "../src/lib/db/env.ts";

const { Pool } = pg;
const envValues = loadDatabaseEnv();
const databaseUrl = process.env.INGEST_DATABASE_URL ?? process.env.DATABASE_URL ?? envValues.INGEST_DATABASE_URL ?? envValues.DATABASE_URL;

if (!databaseUrl) {
  console.error("DB: missing INGEST_DATABASE_URL or DATABASE_URL.");
  process.exit(1);
}

const pool = new Pool({
  ...postgresConnectionOptions(databaseUrl),
  connectionTimeoutMillis: Number(process.env.DB_STATUS_TIMEOUT_MS ?? 10_000)
});

try {
  const status = await pool.query<{
    database_name: string;
    user_name: string;
    postgres_version: string;
    source_files: string;
    results: string;
    exam_events: string;
  }>(`
    select
      current_database() as database_name,
      current_user as user_name,
      version() as postgres_version,
      (select count(*)::text from source_files) as source_files,
      (select count(*)::text from results) as results,
      (select count(*)::text from exam_events) as exam_events
  `);
  const row = status.rows[0];
  console.log("DB: connected");
  console.log(`Database: ${row.database_name}`);
  console.log(`User: ${row.user_name}`);
  console.log(`Postgres: ${row.postgres_version.split(" ").slice(0, 2).join(" ")}`);
  console.log(`Rows: ${row.results} results, ${row.exam_events} events, ${row.source_files} source files`);
} catch (error) {
  console.error(`DB: failed - ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
