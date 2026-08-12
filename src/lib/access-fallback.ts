import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fallbackEventFromPath } from "./ingest/fields";

const execFileAsync = promisify(execFile);

type AccessRow = Record<string, string>;

type Attempt = {
  id: number;
  eventId: number;
  event: string;
  result: string | null;
  internal: number | null;
  theory: number | null;
  total: number | null;
  roll: string | null;
  examCentre: string | null;
  mobile: string | null;
  itgkCode: string | null;
  itgk: string | null;
  spCentre: string | null;
  barcode: string | null;
  bookletSeries: string | null;
  sourceFile: string | null;
  sourceTable: string | null;
};

export async function listAccessExamEvents() {
  const filePath = await latestAccessFile();

  if (!filePath) {
    return [{ id: -1, label: "MARCH 2026", year: 2026, month: 3 }];
  }

  const rows = await runAccessQuery(filePath, "events");
  const labels = new Set(
    rows
      .map((row) => row.EXAM_EVENT?.trim())
      .filter((label): label is string => Boolean(label))
  );

  labels.add("MARCH 2026");

  return [...labels].map((label, index) => ({
    id: -1 - index,
    label,
    year: Number(label.match(/\b(20\d{2})\b/)?.[1]) || null,
    month: label.toLowerCase().includes("march") ? 3 : null
  }));
}

export async function hasAccessResultFile() {
  return Boolean(await latestAccessFile());
}

export async function searchAccessLearners(filters: { q?: string; eventId?: number; result?: string; dob?: string; offset?: number; limit?: number }) {
  if (!filters.q?.trim() && !filters.eventId && !filters.dob?.trim() && (!filters.result || filters.result === "All")) {
    return { learners: [], hasMore: false };
  }

  const filePath = await latestAccessFile();

  if (!filePath) {
    return { learners: [], hasMore: false };
  }

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 300);
  const eventLabel = filters.eventId ? (await listAccessExamEvents()).find((event) => event.id === filters.eventId)?.label : undefined;
  const rows = await runAccessQuery(filePath, "search", {
    query: filters.q ?? "",
    dob: filters.dob ?? "",
    result: filters.result ?? "All",
    eventLabel: eventLabel ?? "",
    offset: filters.offset ?? 0,
    limit: limit + 1
  });
  const learners = rowsToLearners(rows, filePath, undefined, limit + 1);

  return {
    learners: learners.slice(0, limit),
    hasMore: learners.length > limit
  };
}

export async function getAccessLearner(learnerKey: string, eventLabel?: string) {
  const filePath = await latestAccessFile();

  if (!filePath) {
    return null;
  }

  const rows = await runAccessQuery(filePath, "learner", { learnerKey: learnerKey.replace(/\D/g, "") });

  if (!rows.length) {
    return null;
  }

  const learners = rowsToLearners(rows, filePath, eventLabel);
  return learners[0] ?? null;
}

function rowsToLearners(rows: AccessRow[], filePath: string, eventLabel?: string, limit = 300) {
  const learners = new Map<string, { rows: AccessRow[]; attempts: Attempt[] }>();

  rows.forEach((row, index) => {
    const key = clean(row.LNR_CODE);

    if (!key) return;

    const attempt = toAttempt(row, index, filePath);
    if (eventLabel && attempt.event !== eventLabel) return;

    if (!learners.has(key)) {
      learners.set(key, { rows: [], attempts: [] });
    }

    learners.get(key)?.rows.push(row);
    learners.get(key)?.attempts.push(attempt);
  });

  return [...learners.values()].slice(0, limit).map(({ rows: learnerRows, attempts }) => {
    const first = learnerRows[0];

    return {
      id: clean(first.LNR_CODE),
      learnerKey: clean(first.LNR_CODE),
      name: clean(first.NAME) || "UNKNOWN",
      father: clean(first.F_NAME) || null,
      dob: normalizeDate(clean(first.DOB)),
      latest: attempts[0] ?? null,
      attempts,
      summary: summarizeAttempts(attempts)
    };
  });
}

async function latestAccessFile() {
  const uploadDir = path.join(process.cwd(), "uploads");
  const files = await readdir(uploadDir, { withFileTypes: true }).catch(() => []);
  const accessFiles = files
    .filter((file) => file.isFile() && /\.(accdb|mdb)$/i.test(file.name))
    .map((file) => path.join(uploadDir, file.name));

  return accessFiles.sort().at(-1) ?? null;
}

async function runAccessQuery(
  filePath: string,
  mode: "events" | "learner" | "search",
  options: { learnerKey?: string; query?: string; dob?: string; result?: string; eventLabel?: string; offset?: number; limit?: number } = {}
) {
  const scriptPath = path.join(process.cwd(), "scripts", "query-access.ps1");
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-FilePath",
      filePath,
      "-Mode",
      mode,
      "-LearnerKey",
      options.learnerKey ?? "",
      "-Query",
      options.query ?? "",
      "-Dob",
      options.dob ?? "",
      "-Result",
      options.result ?? "",
      "-EventLabel",
      options.eventLabel ?? "",
      "-Offset",
      String(options.offset ?? 0),
      "-Limit",
      String(options.limit ?? 100)
    ],
    { maxBuffer: 1024 * 1024 * 40 }
  );

  const parsed = stdout.trim() ? JSON.parse(stdout) : [];
  return (Array.isArray(parsed) ? parsed : [parsed]) as AccessRow[];
}

function toAttempt(row: AccessRow, index: number, filePath: string): Attempt {
  return {
    id: -1 - index,
    eventId: -1,
    event: clean(row.EXAM_EVENT) || fallbackEventFromPath(filePath, "Master"),
    result: clean(row.RESULT)?.toUpperCase() || null,
    internal: toInteger(row.INT_MARKS),
    theory: toInteger(row.TH_MARKS || row.MARKS),
    total: toInteger(row.TOTAL_MRKS),
    roll: clean(row.ROLLNO) || null,
    examCentre: clean(row.CENTER) || null,
    mobile: clean(row.MOB) || null,
    itgkCode: clean(row.ITGK_CODE) || null,
    itgk: clean(row.ITGKNM) || null,
    spCentre: clean(row.ITGKSP) || null,
    barcode: clean(row.BCODE) || null,
    bookletSeries: clean(row.PHASE) || null,
    sourceFile: filePath,
    sourceTable: "Master"
  };
}

function summarizeAttempts(attempts: Attempt[]) {
  const passAttempts = attempts.filter((attempt) => attempt.result === "PASS");
  const failAttempts = attempts.filter((attempt) => attempt.result === "FAIL");
  const bestScore = maxNumber(attempts.map((attempt) => attempt.total));
  const bestPassScore = maxNumber(passAttempts.map((attempt) => attempt.total));
  const bestAttempt = attempts.find((attempt) => attempt.total === bestScore) ?? null;
  const bestPassAttempt = passAttempts.find((attempt) => attempt.total === bestPassScore) ?? null;

  return {
    status: passAttempts.length ? "PASS" : "FAIL",
    passCount: passAttempts.length,
    failCount: failAttempts.length,
    bestScore,
    bestPassScore,
    bestEvent: bestAttempt?.event ?? null,
    bestPassEvent: bestPassAttempt?.event ?? null
  };
}

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function toInteger(value: string | undefined) {
  const match = clean(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function maxNumber(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length ? Math.max(...numbers) : null;
}

function normalizeDate(value: string) {
  if (!value) return null;

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    return `${slashMatch[3]}-${month}-${day}`;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return value;
}
