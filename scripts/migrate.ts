import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadDatabaseEnv } from "../src/lib/db/env.ts";
import { db, pool } from "../src/lib/db";

process.env.DATABASE_URL ??= loadDatabaseEnv().DATABASE_URL;

await migrate(db, { migrationsFolder: "drizzle" });
await pool.end();
