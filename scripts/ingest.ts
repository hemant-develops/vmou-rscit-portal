import { readdir } from "node:fs/promises";
import path from "node:path";
import { ingestPool, loadRows } from "./lib/loader";
import { readSources } from "./lib/sources";

const [, , command, target, ...flags] = process.argv;

if (command !== "load" || !target) {
  console.error("Usage: npm run ingest -- load <file-or-folder> [--source-rank <number>]");
  process.exit(1);
}

const sourceRank = parseFlagNumber(flags, "--source-rank", 0);
const files = await collectFiles(path.resolve(target));
let total = 0;

for (const filePath of files) {
  for await (const source of readSources(filePath)) {
    // Check karo ki yeh file/table pehle se database mein ingest ho chuki hai ya nahi
    const existingFile = await ingestPool.query(
      `select id, row_count from source_files where path = $1 and table_name = $2 limit 1`,
      [source.filePath, source.tableName]
    );

    if (existingFile.rows.length > 0 && existingFile.rows[0].row_count > 0) {
      console.log(`Skipping already processed: ${source.filePath} :: ${source.tableName} (${existingFile.rows[0].row_count} rows)`);
      continue;
    }

    const result = await loadRows({
      sourcePath: source.filePath,
      sourceTable: source.tableName,
      rows: source.rows,
      sourceRank
    });

    total += result.inserted;
    console.log(`${filePath} :: ${source.tableName} :: ${result.inserted} rows`);
  }
}

await ingestPool.end();
console.log(`Imported ${total} rows`);

async function collectFiles(targetPath: string): Promise<string[]> {
  const entries = await readdir(targetPath, { withFileTypes: true }).catch(() => null);
  const allowed = new Set([".mdb", ".accdb", ".xlsx", ".xls", ".xlsm", ".csv", ".dbf", ".pdf"]);

  if (!entries) {
    return allowed.has(path.extname(targetPath).toLowerCase()) ? [targetPath] : [];
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const childPath = path.join(targetPath, entry.name);
      return entry.isDirectory() ? collectFiles(childPath) : allowed.has(path.extname(entry.name).toLowerCase()) ? [childPath] : [];
    })
  );

  return nested.flat();
}

function parseFlagNumber(flags: string[], name: string, fallback: number) {
  const index = flags.indexOf(name);
  if (index === -1) return fallback;

  const value = Number(flags[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}