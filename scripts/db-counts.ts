import pg from "pg";
import { loadDatabaseEnv } from "../src/lib/db/env.ts";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ?? loadDatabaseEnv().DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("rds.amazonaws.com") ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000
});

try {
  const counts = await pool.query<{ table_name: string; count: string }>(`
    select 'exam_events' as table_name, count(*)::bigint as count from exam_events
    union all
    select 'source_files', count(*)::bigint from source_files
    union all
    select 'results', count(*)::bigint from results
  `);

  console.table(counts.rows);
} finally {
  await pool.end();
}
