import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "./index";
import { eventDistrictSummaries, examEvents, results, sourceFiles } from "./schema";

export type SearchFilters = {
  q?: string;
  eventId?: number;
  result?: string;
  dob?: string;
  offset?: number;
  limit?: number;
};

const trackedResultStatuses = ["PASS", "FAIL", "ABSENT", "UFM", "RLW"] as const;

export async function listExamEvents() {
  return db
    .select({
      id: examEvents.id,
      label: examEvents.label,
      year: examEvents.year,
      month: examEvents.month
    })
    .from(examEvents)
    .orderBy(desc(examEvents.year), desc(examEvents.month), asc(examEvents.label));
}

// export async function listExamEventSummaries() {
//   const rows = await db
//     .select({
//       id: examEvents.id,
//       label: examEvents.label,
//       year: examEvents.year,
//       month: examEvents.month,
//       attempts: sql<number>`(count(${results.id}))::int`,
//       learners: sql<number>`(count(distinct ${results.learnerKey}))::int`,
//       pass: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'PASS'))::int`,
//       fail: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'FAIL'))::int`,
//       absent: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'ABSENT'))::int`,
//       ufm: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'UFM'))::int`,
//       rlw: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'RLW'))::int`,
//       other: sql<number>`(
//         count(${results.id}) filter (
//           where coalesce(nullif(upper(${results.resultStatus}), ''), 'UNKNOWN') not in ('PASS', 'FAIL', 'ABSENT', 'UFM', 'RLW')
//         )
//       )::int`,
//       withMarks: sql<number>`(count(${results.id}) filter (where ${results.marksTotal} is not null))::int`,
//       averageMarks: sql<number | null>`round(avg(${results.marksTotal})::numeric, 2)::float`,
//       lastUpdated: sql<string | null>`max(${results.updatedAt})::text`
//     })
//     .from(examEvents)
//     .leftJoin(results, eq(results.examEventId, examEvents.id))
//     .groupBy(examEvents.id, examEvents.label, examEvents.year, examEvents.month)
//     .orderBy(desc(examEvents.year), desc(examEvents.month), asc(examEvents.label));

//   const events = rows.map((row) => {
//     const resultCounts = {
//       PASS: toNumber(row.pass),
//       FAIL: toNumber(row.fail),
//       ABSENT: toNumber(row.absent),
//       UFM: toNumber(row.ufm),
//       RLW: toNumber(row.rlw),
//       OTHER: toNumber(row.other)
//     };
//     const attempts = toNumber(row.attempts);

//     return {
//       id: row.id,
//       label: row.label,
//       year: row.year,
//       month: row.month,
//       attempts,
//       appeared: attempts - resultCounts.ABSENT,
//       learners: toNumber(row.learners),
//       resultCounts,
//       passPercentage: percentage(resultCounts.PASS, attempts - resultCounts.ABSENT),
//       withMarks: toNumber(row.withMarks),
//       averageMarks: row.averageMarks === null ? null : Number(row.averageMarks),
//       lastUpdated: row.lastUpdated
//     };
//   });

//   const summary = summarizeEvents(events);

//   return {
//     events,
//     summary: {
//       ...summary,
//       passPercentage: percentage(summary.resultCounts.PASS, summary.appeared)
//     }
//   };
// }
export async function listExamEventSummaries() {
  const rows = await db
    .select({
      id: examEvents.id,
      label: examEvents.label,
      year: examEvents.year,
      month: examEvents.month,
      attempts: sql<number>`(count(${results.id}))::int`,
      learners: sql<number>`(count(distinct ${results.learnerKey}))::int`,
      pass: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'PASS'))::int`,
      fail: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'FAIL'))::int`,
      absent: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'ABSENT'))::int`,
      ufm: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'UFM'))::int`,
      rlw: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'RLW'))::int`,
      other: sql<number>`(
        count(${results.id}) filter (
          where coalesce(nullif(upper(${results.resultStatus}), ''), 'UNKNOWN') not in ('PASS', 'FAIL', 'ABSENT', 'UFM', 'RLW')
        )
      )::int`,
      withMarks: sql<number>`(count(${results.id}) filter (where ${results.marksTotal} is not null))::int`,
      averageMarks: sql<number | null>`round(avg(${results.marksTotal})::numeric, 2)::float`,
      lastUpdated: sql<string | null>`max(${results.updatedAt})::text`
    })
    .from(examEvents)
    .leftJoin(results, eq(results.examEventId, examEvents.id))
    // --- EXACT YE LINE CHANGE KI HAI ---
    .where(sql`upper(trim(${examEvents.label})) = 'MARCH 2026'`) 
    // ------------------------------------
    .groupBy(examEvents.id, examEvents.label, examEvents.year, examEvents.month);

  const events = rows.map((row) => {
    const resultCounts = {
      PASS: toNumber(row.pass),
      FAIL: toNumber(row.fail),
      ABSENT: toNumber(row.absent),
      UFM: toNumber(row.ufm),
      RLW: toNumber(row.rlw),
      OTHER: toNumber(row.other)
    };
    const attempts = toNumber(row.attempts);

    return {
      id: row.id,
      label: row.label,
      year: row.year,
      month: row.month,
      attempts,
      appeared: attempts - resultCounts.ABSENT,
      learners: toNumber(row.learners),
      resultCounts,
      passPercentage: percentage(resultCounts.PASS, attempts - resultCounts.ABSENT),
      withMarks: toNumber(row.withMarks),
      averageMarks: row.averageMarks === null ? null : Number(row.averageMarks),
      lastUpdated: row.lastUpdated
    };
  });

  const summary = summarizeEvents(events);

  return {
    events,
    summary: {
      ...summary,
      passPercentage: percentage(summary.resultCounts.PASS, summary.appeared)
    }
  };
}

export async function listExamEventDistrictSummaries(eventId: number) {
  const cachedRows = await db
    .select({
      district: eventDistrictSummaries.district,
      attempts: eventDistrictSummaries.attempts,
      appeared: eventDistrictSummaries.appeared,
      pass: eventDistrictSummaries.pass,
      fail: eventDistrictSummaries.fail
    })
    .from(eventDistrictSummaries)
    .where(eq(eventDistrictSummaries.examEventId, eventId))
    .orderBy(desc(eventDistrictSummaries.appeared), asc(eventDistrictSummaries.district));

  if (cachedRows.length) {
    return mapDistrictRows(cachedRows);
  }

  return refreshExamEventDistrictSummaries(eventId);
}

async function refreshExamEventDistrictSummaries(eventId: number) {
  const districtRows = await db
    .select({
      district: sql<string>`coalesce(nullif(upper(${results.extra}->>'DISTRICT'), ''), nullif(upper(${results.extra}->>'district'), ''), nullif(upper(${results.extra}->>'ITGKDST'), ''), 'NOT RECORDED')`,
      attempts: sql<number>`(count(${results.id}))::int`,
      appeared: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) <> 'ABSENT'))::int`,
      pass: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'PASS'))::int`,
      fail: sql<number>`(count(${results.id}) filter (where upper(coalesce(${results.resultStatus}, '')) = 'FAIL'))::int`
    })
    .from(results)
    .where(eq(results.examEventId, eventId))
    .groupBy(
      sql`coalesce(nullif(upper(${results.extra}->>'DISTRICT'), ''), nullif(upper(${results.extra}->>'district'), ''), nullif(upper(${results.extra}->>'ITGKDST'), ''), 'NOT RECORDED')`
    )
    .orderBy(asc(sql`coalesce(nullif(upper(${results.extra}->>'DISTRICT'), ''), nullif(upper(${results.extra}->>'district'), ''), nullif(upper(${results.extra}->>'ITGKDST'), ''), 'NOT RECORDED')`));

  if (districtRows.length) {
    await db
      .insert(eventDistrictSummaries)
      .values(
        districtRows.map((row) => ({
          examEventId: eventId,
          district: row.district,
          attempts: toNumber(row.attempts),
          appeared: toNumber(row.appeared),
          pass: toNumber(row.pass),
          fail: toNumber(row.fail)
        }))
      )
      .onConflictDoUpdate({
        target: [eventDistrictSummaries.examEventId, eventDistrictSummaries.district],
        set: {
          attempts: sql`excluded.attempts`,
          appeared: sql`excluded.appeared`,
          pass: sql`excluded.pass`,
          fail: sql`excluded.fail`,
          updatedAt: sql`now()`
        }
      });
  }

  return mapDistrictRows(districtRows);
}

function mapDistrictRows(rows: Array<{
  district: string;
  attempts: number | string | null | undefined;
  appeared: number | string | null | undefined;
  pass: number | string | null | undefined;
  fail: number | string | null | undefined;
}>) {
  return rows
    .map((row) => {
      const appeared = toNumber(row.appeared);
      return {
        district: row.district,
        attempts: toNumber(row.attempts),
        appeared,
        pass: toNumber(row.pass),
        fail: toNumber(row.fail),
        passPercentage: percentage(toNumber(row.pass), appeared)
      };
    })
    .filter((district) => district.attempts > 0)
    .sort((a, b) => b.appeared - a.appeared || a.district.localeCompare(b.district));
}

function summarizeEvents(events: Array<{
  attempts: number;
  appeared: number;
  learners: number;
  withMarks: number;
  resultCounts: Record<(typeof trackedResultStatuses)[number] | "OTHER", number>;
}>) {
  type EventTotals = {
    events: number;
    attempts: number;
    appeared: number;
    learners: number;
    withMarks: number;
    resultCounts: Record<(typeof trackedResultStatuses)[number] | "OTHER", number>;
  };

  return events.reduce<EventTotals>(
    (total, event) => {
      total.events += 1;
      total.attempts += event.attempts;
      total.appeared += event.appeared;
      total.learners += event.learners;
      total.withMarks += event.withMarks;
      trackedResultStatuses.forEach((status) => {
        total.resultCounts[status] += event.resultCounts[status];
      });
      total.resultCounts.OTHER += event.resultCounts.OTHER;
      return total;
    },
    {
      events: 0,
      attempts: 0,
      appeared: 0,
      learners: 0,
      withMarks: 0,
      resultCounts: {
        PASS: 0,
        FAIL: 0,
        ABSENT: 0,
        UFM: 0,
        RLW: 0,
        OTHER: 0
      }
    }
  );
}

export async function searchLearners(filters: SearchFilters) {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 300);
  const offset = Math.max(filters.offset ?? 0, 0);
  const terms = (filters.q ?? "").trim().split(/\s+/).filter(Boolean);
  const numericLookup = terms.length === 1 && /^\d{5,}$/.test(terms[0]);
  const conditions: SQL[] = [];

  if (numericLookup) {
    const digits = terms[0].replace(/\D/g, "");
    conditions.push(
      or(
        eq(results.learnerKey, digits),
        eq(results.rollNumber, digits),
        eq(results.mobile, digits),
        eq(results.barcode, digits)
      ) ?? sql`false`
    );
  } else {
    terms.forEach((term) => {
      const pattern = `%${term}%`;
      conditions.push(
        sql`concat_ws(' ', ${results.name}, ${results.fatherName}, ${results.learnerKey}, ${results.rollNumber}, ${results.mobile}) ilike ${pattern}`
      );
    });
  }

  if (filters.eventId) {
    conditions.push(eq(results.examEventId, filters.eventId));
  }

  const resultStatus = filters.result?.trim().toUpperCase();
  if (resultStatus && resultStatus !== "ALL") {
    conditions.push(eq(results.resultStatus, resultStatus));
  }

  if (filters.dob) {
    conditions.push(eq(results.dob, filters.dob));
  }

  const candidateRows = await db
    .selectDistinct({
      learnerKey: results.learnerKey
    })
    .from(results)
    .innerJoin(examEvents, eq(results.examEventId, examEvents.id))
    .where(conditions.length ? and(...conditions) : sql`false`)
    .orderBy(asc(results.learnerKey))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = candidateRows.length > limit;
  const learnerKeys = candidateRows.slice(0, limit).map((row) => row.learnerKey);

  if (!learnerKeys.length) {
    return { learners: [], hasMore: false };
  }

  const attemptConditions = [inArray(results.learnerKey, learnerKeys)];

  if (filters.eventId) {
    attemptConditions.push(eq(results.examEventId, filters.eventId));
  }

  const rows = await db
    .select({
      id: results.id,
      learnerKey: results.learnerKey,
      name: results.name,
      fatherName: results.fatherName,
      dob: results.dob,
      result: results.resultStatus,
      internalMarks: results.marksInternal,
      theoryMarks: results.marksTheory,
      totalMarks: results.marksTotal,
      rollNumber: results.rollNumber,
      examCentre: results.examCentre,
      mobile: results.mobile,
      itgkCode: results.itgkCode,
      itgkName: results.itgkName,
      spCentre: results.spCentre,
      barcode: results.barcode,
      bookletSeries: results.bookletSeries,
      eventId: examEvents.id,
      eventLabel: examEvents.label,
      sourcePath: sourceFiles.path,
      sourceTable: sourceFiles.tableName
    })
    .from(results)
    .innerJoin(examEvents, eq(results.examEventId, examEvents.id))
    .leftJoin(sourceFiles, eq(results.sourceFileId, sourceFiles.id))
    .where(and(...attemptConditions))
    .orderBy(desc(examEvents.year), desc(examEvents.month), asc(results.name));

  const learners = new Map<string, ReturnType<typeof makeLearner>>();

  rows.forEach((row) => {
    if (!learners.has(row.learnerKey)) {
      learners.set(row.learnerKey, makeLearner(row));
    }

    learners.get(row.learnerKey)?.attempts.push({
      id: row.id,
      eventId: row.eventId,
      event: row.eventLabel,
      result: row.result,
      internal: row.internalMarks,
      theory: row.theoryMarks,
      total: row.totalMarks,
      roll: row.rollNumber,
      examCentre: row.examCentre,
      mobile: row.mobile,
      itgkCode: row.itgkCode,
      itgk: row.itgkName,
      spCentre: row.spCentre,
      barcode: row.barcode,
      bookletSeries: row.bookletSeries,
      sourceFile: row.sourcePath,
      sourceTable: row.sourceTable
    });
  });

  return {
    learners: [...learners.values()].map((learner) => ({
      ...learner,
      latest: learner.attempts[0] ?? null,
      summary: summarizeAttempts(learner.attempts)
    })),
    hasMore
  };
}

export async function getLearner(learnerKey: string) {
  const rows = await db
    .select({
      id: results.id,
      learnerKey: results.learnerKey,
      name: results.name,
      fatherName: results.fatherName,
      dob: results.dob,
      result: results.resultStatus,
      internalMarks: results.marksInternal,
      theoryMarks: results.marksTheory,
      totalMarks: results.marksTotal,
      rollNumber: results.rollNumber,
      examCentre: results.examCentre,
      mobile: results.mobile,
      itgkCode: results.itgkCode,
      itgkName: results.itgkName,
      spCentre: results.spCentre,
      barcode: results.barcode,
      bookletSeries: results.bookletSeries,
      eventId: examEvents.id,
      eventLabel: examEvents.label,
      sourcePath: sourceFiles.path,
      sourceTable: sourceFiles.tableName
    })
    .from(results)
    .innerJoin(examEvents, eq(results.examEventId, examEvents.id))
    .leftJoin(sourceFiles, eq(results.sourceFileId, sourceFiles.id))
    .where(eq(results.learnerKey, learnerKey.replace(/\D/g, "")))
    .orderBy(desc(examEvents.year), desc(examEvents.month), asc(examEvents.label));

  if (!rows.length) {
    return null;
  }

  const first = rows[0];
  const attempts = rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    event: row.eventLabel,
    result: row.result,
    internal: row.internalMarks,
    theory: row.theoryMarks,
    total: row.totalMarks,
    roll: row.rollNumber,
    examCentre: row.examCentre,
    mobile: row.mobile,
    itgkCode: row.itgkCode,
    itgk: row.itgkName,
    spCentre: row.spCentre,
    barcode: row.barcode,
    bookletSeries: row.bookletSeries,
    sourceFile: row.sourcePath,
    sourceTable: row.sourceTable
  }));

  return {
    id: first.learnerKey,
    learnerKey: first.learnerKey,
    name: first.name,
    father: first.fatherName,
    dob: first.dob,
    latest: attempts[0] ?? null,
    attempts,
    summary: summarizeAttempts(attempts)
  };
}

function makeLearner(row: {
  learnerKey: string;
  name: string;
  fatherName: string | null;
  dob: string | null;
}) {
  return {
    id: row.learnerKey,
    learnerKey: row.learnerKey,
    name: row.name,
    father: row.fatherName,
    dob: row.dob,
    attempts: [] as Array<Record<string, unknown>>
  };
}

function summarizeAttempts(attempts: Array<Record<string, unknown>>) {
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
    bestEvent: typeof bestAttempt?.event === "string" ? bestAttempt.event : null,
    bestPassEvent: typeof bestPassAttempt?.event === "string" ? bestPassAttempt.event : null
  };
}

function maxNumber(values: unknown[]) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length ? Math.max(...numbers) : null;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function percentage(numerator: number, denominator: number) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}
