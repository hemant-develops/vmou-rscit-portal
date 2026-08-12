import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadDatabaseEnv } from "./env.ts";

test("loadDatabaseEnv reads values from a local env file", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "db-env-"));
  const envPath = path.join(dir, ".env.local");

  await writeFile(envPath, "DATABASE_URL=postgres://example:5432/test\n", "utf8");

  try {
    const env = await loadDatabaseEnv({ cwd: dir, envPath });
    assert.equal(env.DATABASE_URL, "postgres://example:5432/test");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
