import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse";
import * as XLSX from "xlsx";
import MDBReader from "mdb-reader";

export type RawRow = Record<string, unknown>;

export type RowSource = {
  filePath: string;
  tableName: string;
  rows: AsyncIterable<RawRow>;
};

const sheetExtensions = new Set([".xlsx", ".xls", ".xlsm", ".dbf"]);

export async function* readSources(filePath: string): AsyncGenerator<RowSource> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".mdb" || extension === ".accdb") {
    yield* readAccessSources(filePath);
    return;
  }

  if (extension === ".csv") {
    yield {
      filePath,
      tableName: path.basename(filePath),
      rows: readCsvRows(filePath)
    };
    return;
  }

  if (sheetExtensions.has(extension)) {
    yield* readSheetSources(filePath);
    return;
  }

  if (extension === ".pdf") {
    yield {
      filePath,
      tableName: "pdf_text_positions",
      rows: readPdfRows(filePath)
    };
  }
}

async function* readAccessSources(filePath: string): AsyncGenerator<RowSource> {
  const buffer = await readFile(filePath);
  const reader = new MDBReader(buffer);
  const tableNames = reader.getTableNames().filter((name) => !name.startsWith("MSys") && !name.startsWith("~"));

  for (const tableName of tableNames) {
    yield {
      filePath,
      tableName,
      rows: streamAccessTable(reader, tableName)
    };
  }
}

async function* streamAccessTable(reader: MDBReader, tableName: string): AsyncGenerator<RawRow> {
  const table = reader.getTable(tableName);
  const rows = table.getData();

  for (const row of rows) {
    yield row as RawRow;
  }
}

async function* readCsvRows(filePath: string): AsyncGenerator<RawRow> {
  const parser = createReadStream(filePath).pipe(
    parse({ columns: true, bom: true, skip_empty_lines: true, relax_column_count: true })
  );

  for await (const row of parser) {
    yield row as RawRow;
  }
}

async function* readSheetSources(filePath: string): AsyncGenerator<RowSource> {
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  for (const sheetName of workbook.SheetNames) {
    yield {
      filePath,
      tableName: sheetName,
      rows: sheetRows(workbook.Sheets[sheetName])
    };
  }
}

async function* sheetRows(sheet: XLSX.WorkSheet): AsyncGenerator<RawRow> {
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  for (const row of rows) {
    yield row;
  }
}

async function* readPdfRows(filePath: string): AsyncGenerator<RawRow> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = await readFile(filePath);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const text = await page.getTextContent();

    for (const item of text.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const transform = "transform" in item && Array.isArray(item.transform) ? item.transform : [];
      yield {
        page: pageNumber,
        text: item.str,
        x: Number(transform[4] ?? 0),
        y: Number(transform[5] ?? 0)
      };
    }
  }
}