import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-access";
import { databaseErrorMessage } from "@/lib/db/errors";
import { canonicalize, fallbackEventFromPath } from "@/lib/ingest/fields";
import { loadRows } from "@/lib/ingest/loader";
import { readResultFile } from "@/lib/ingest/readers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminJson();
  if (unauthorized) return unauthorized;

  const maxUploadBytes = maxWebUploadBytes();
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (maxUploadBytes && contentLength > maxUploadBytes) {
    return NextResponse.json({ error: largeUploadMessage() }, { status: 413 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const oversizedFile = maxUploadBytes ? files.find((file) => file.size > maxUploadBytes) : null;
  if (oversizedFile) {
    return NextResponse.json({ error: largeUploadMessage(oversizedFile.name) }, { status: 413 });
  }

  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });

  let imported = 0;
  const details = [];

  try {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9_. -]/g, "_");
      const filePath = path.join(uploadDir, `${Date.now()}-${safeName}`);
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, bytes);

      const tables = await readResultFile(filePath);

      for (const table of tables) {
        const fallbackEvent = fallbackEventFromPath(filePath, table.tableName);
        const rows = table.rows
          .map((row) => canonicalize(row, fallbackEvent))
          .filter((row) => row !== null);

        const result = await loadRows({
          sourcePath: filePath,
          sourceTable: table.tableName,
          originalName: file.name,
          rows
        });

        imported += result.inserted;
        details.push({ file: file.name, table: table.tableName, rows: result.inserted });
      }
    }
  } catch (error) {
    return NextResponse.json({ error: databaseErrorMessage(error) }, { status: 503 });
  }

  return NextResponse.json({ imported, details });
}

function maxWebUploadBytes() {
  const configuredValue = process.env.WEB_UPLOAD_MAX_MB;
  if (!configuredValue) return null;

  const configuredMb = Number(configuredValue);
  return Number.isFinite(configuredMb) && configuredMb > 0 ? configuredMb * 1024 * 1024 : null;
}

function largeUploadMessage(fileName?: string) {
  const prefix = fileName ? `${fileName} is too large for browser upload.` : "Upload is too large for browser upload.";
  return `${prefix} Use the server CLI ingest for large result files.`;
}
