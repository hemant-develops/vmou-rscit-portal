import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveDbCredentials } from "../drizzle.config.ts";

test("resolveDbCredentials reads DATABASE_URL from .env.local", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "drizzle-config-"));
  const envPath = path.join(dir, ".env.local");
  const originalCwd = process.cwd();

  await writeFile(envPath, "DATABASE_URL=postgres://user:pass@host:5432/app\n", "utf8");

  try {
    process.chdir(dir);
    const credentials = resolveDbCredentials();
    assert.equal(credentials.url, "postgres://user:pass@host:5432/app");
  } finally {
    process.chdir(originalCwd);
    await rm(dir, { recursive: true, force: true });
  }
});
