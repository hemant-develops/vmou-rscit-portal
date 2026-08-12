import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import * as XLSX from "xlsx";
import { parseCsv } from "./csv";

const execFileAsync = promisify(execFile);

export type RawTable = {
  tableName: string;
  rows: Record<string, unknown>[];
};

export async function readResultFile(filePath: string): Promise<RawTable[]> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".mdb" || extension === ".accdb") {
    return readAccessFile(filePath);
  }

  if ([".xlsx", ".xls", ".xlsm", ".csv", ".dbf"].includes(extension)) {
    return readSheetFile(filePath);
  }

  if (extension === ".pdf") {
    return readPdfFile(filePath);
  }

  return [];
}

async function readAccessFile(filePath: string): Promise<RawTable[]> {
  try {
    return await readAccessWithMdbTools(filePath);
  } catch (error) {
    if (isMissingCommandError(error)) {
      return readAccessWithPowerShell(filePath);
    }

    throw error;
  }
}

async function readAccessWithMdbTools(filePath: string): Promise<RawTable[]> {
  const tableOutput = await runMdbTool("mdb-tables", ["-1", filePath]);
  const tableNames = tableOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => isUserTable(line));

  const tables: RawTable[] = [];

  for (const tableName of tableNames) {
    const stdout = await runMdbTool("mdb-export", [filePath, tableName], 1024 * 1024 * 200);

    tables.push({
      tableName,
      rows: parseCsv(stdout)
    });
  }

  return tables;
}

async function readAccessWithPowerShell(filePath: string): Promise<RawTable[]> {
  const scriptPath = path.join(process.cwd(), "scripts", "read-access.ps1");
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vmou-access-"));

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-FilePath", filePath, "-OutDir", tempDir],
      { maxBuffer: 1024 * 1024 * 300 }
    );
    const exports = JSON.parse(stdout) as Array<{ tableName: string; csvPath: string }>;
    const tables: RawTable[] = [];

    for (const item of exports) {
      tables.push({
        tableName: item.tableName,
        rows: parseCsv(await readFile(item.csvPath, "utf8"))
      });
    }

    return tables;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      throw new Error(
        "mdbtools was not found and PowerShell is unavailable. Install mdbtools, or run on Windows with the Microsoft Access Database Engine installed."
      );
    }

    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runMdbTool(command: string, args: string[], maxBuffer = 1024 * 1024 * 20) {
  try {
    const { stdout } = await execFileAsync(command, args, { maxBuffer });
    return stdout;
  } catch (error) {
    if (isMissingCommandError(error)) {
      throw new Error(
        `${command} was not found. Install mdbtools and make sure ${command} is available on PATH before importing .mdb or .accdb files.`
      );
    }

    throw error;
  }
}

function isMissingCommandError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? error.code : null;
  return code === "ENOENT" || (error instanceof Error && error.message.includes("was not found"));
}

function isUserTable(tableName: string) {
  return Boolean(tableName) && !tableName.startsWith("MSys") && !tableName.startsWith("~");
}

function readSheetFile(filePath: string): RawTable[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  return workbook.SheetNames.map((sheetName) => ({
    tableName: sheetName,
    rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: ""
    })
  }));
}

async function readPdfFile(filePath: string): Promise<RawTable[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = await readFile(filePath);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const rows: Record<string, unknown>[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const text = await page.getTextContent();
    const line = text.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    rows.push({ page: pageNumber, text: line });
  }

  return [{ tableName: "pdf_text", rows }];
}
