import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { postgresConnectionOptions } from "../../src/lib/db/connection";
import { canonicalize, fallbackEventFromPath, type CanonicalRow } from "../../src/lib/ingest/fields";
import type { RawRow } from "./sources";

const { Pool } = pg;

const ingestDatabaseUrl = process.env.INGEST_DATABASE_URL ?? process.env.DATABASE_URL;

export const ingestPool = new Pool({
  ...postgresConnectionOptions(ingestDatabaseUrl),
  max: Number(process.env.INGEST_POOL_SIZE ?? 4),
  statement_timeout: Number(process.env.INGEST_STATEMENT_TIMEOUT_MS ?? 0)
});

export type LoadOptions = {
  sourcePath: string;
  sourceTable: string;
  originalName?: string;
  rows: Iterable<CanonicalRow | RawRow> | AsyncIterable<CanonicalRow | RawRow>;
  sourceRank?: number;
};

const copyColumns = [
  "learner_key",
  "event_label",
  "name",
  "father_name",
  "dob",
  "marks_internal",
  "marks_theory",
  "marks_total",
  "result_status",
  "itgk_code",
  "source_rank",
  "extra",
  "roll_number",
  "exam_centre",
  "mobile",
  "itgk_name",
  "sp_centre",
  "barcode",
  "booklet_series"
] as const;

export async function loadRows(options: LoadOptions) {
  if (!ingestDatabaseUrl) {
    throw new Error("INGEST_DATABASE_URL or DATABASE_URL is required for ingestion.");
  }

  const client = await ingestPool.connect();

  try {
    await client.query("begin");

    const source = await client.query<{ id: number }>(
      `
        insert into source_files (path, table_name, original_name, row_count)
        values ($1, $2, $3, 0)
        returning id
      `,
      [options.sourcePath, options.sourceTable, options.originalName ?? null]
    );

    await client.query(`
      create temp table ingest_results_staging (
        learner_key text not null,
        event_label text not null,
        name text,
        father_name text,
        dob text,
        marks_internal integer,
        marks_theory integer,
        marks_total integer,
        result_status text,
        itgk_code text,
        source_rank integer not null default 0,
        extra jsonb not null default '{}'::jsonb,
        roll_number text,
        exam_centre text,
        mobile text,
        itgk_name text,
        sp_centre text,
        barcode text,
        booklet_series text
      ) on commit drop
    `);

    const rows = canonicalRows(options);
    const copyStream = (client.query as unknown as (query: NodeJS.WritableStream) => NodeJS.WritableStream)(
      copyFrom(`copy ingest_results_staging (${copyColumns.join(", ")}) from stdin with (format csv)`) as NodeJS.WritableStream
    );
    const inserted = await copyRows(rows, copyStream);

    await client.query(
      `
        insert into exam_events (label, year, month)
        select distinct
          event_label,
          nullif(substring(event_label from '(20[0-9]{2})'), '')::integer,
          case
            when event_label ilike '%january%' then 1
            when event_label ilike '%february%' then 2
            when event_label ilike '%march%' then 3
            when event_label ilike '%april%' then 4
            when event_label ilike '%may%' then 5
            when event_label ilike '%june%' then 6
            when event_label ilike '%july%' then 7
            when event_label ilike '%august%' then 8
            when event_label ilike '%september%' then 9
            when event_label ilike '%october%' then 10
            when event_label ilike '%november%' then 11
            when event_label ilike '%december%' then 12
            else null
          end
        from ingest_results_staging
        on conflict (label) do update set
          year = coalesce(excluded.year, exam_events.year),
          month = coalesce(excluded.month, exam_events.month)
      `
    );

    await client.query(
      `
        insert into results (
          learner_key,
          exam_event_id,
          source_file_id,
          name,
          father_name,
          dob,
          marks_internal,
          marks_theory,
          marks_total,
          result_status,
          itgk_code,
          source_rank,
          extra,
          roll_number,
          exam_centre,
          mobile,
          itgk_name,
          sp_centre,
          barcode,
          booklet_series,
          updated_at
        )
        select
          s.learner_key,
          e.id,
          $1,
          coalesce(nullif(s.name, ''), 'UNKNOWN'),
          nullif(s.father_name, ''),
          s.dob,
          s.marks_internal,
          s.marks_theory,
          s.marks_total,
          nullif(s.result_status, ''),
          nullif(s.itgk_code, ''),
          s.source_rank,
          s.extra,
          nullif(s.roll_number, ''),
          nullif(s.exam_centre, ''),
          nullif(s.mobile, ''),
          nullif(s.itgk_name, ''),
          nullif(s.sp_centre, ''),
          nullif(s.barcode, ''),
          nullif(s.booklet_series, ''),
          now()
        from ingest_results_staging s
        join exam_events e on e.label = s.event_label
        on conflict (learner_key, exam_event_id) do update set
          source_file_id = excluded.source_file_id,
          name = coalesce(nullif(excluded.name, 'UNKNOWN'), results.name),
          father_name = coalesce(nullif(excluded.father_name, ''), results.father_name),
          dob = coalesce(excluded.dob, results.dob),
          marks_internal = coalesce(excluded.marks_internal, results.marks_internal),
          marks_theory = coalesce(excluded.marks_theory, results.marks_theory),
          marks_total = coalesce(excluded.marks_total, results.marks_total),
          result_status = coalesce(nullif(excluded.result_status, ''), results.result_status),
          itgk_code = coalesce(nullif(excluded.itgk_code, ''), results.itgk_code),
          source_rank = greatest(excluded.source_rank, results.source_rank),
          extra = results.extra || excluded.extra,
          roll_number = coalesce(nullif(excluded.roll_number, ''), results.roll_number),
          exam_centre = coalesce(nullif(excluded.exam_centre, ''), results.exam_centre),
          mobile = coalesce(nullif(excluded.mobile, ''), results.mobile),
          itgk_name = coalesce(nullif(excluded.itgk_name, ''), results.itgk_name),
          sp_centre = coalesce(nullif(excluded.sp_centre, ''), results.sp_centre),
          barcode = coalesce(nullif(excluded.barcode, ''), results.barcode),
          booklet_series = coalesce(nullif(excluded.booklet_series, ''), results.booklet_series),
          updated_at = now()
        where excluded.source_rank >= results.source_rank
      `,
      [source.rows[0].id]
    );

    await client.query("update source_files set row_count = $1 where id = $2", [inserted, source.rows[0].id]);
    await client.query("commit");

    return { inserted };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function* canonicalRows(options: LoadOptions): AsyncGenerator<CanonicalRow> {
  const fallbackEvent = fallbackEventFromPath(options.sourcePath, options.sourceTable);

  for await (const row of toAsync(options.rows)) {
    if (isCanonicalRow(row)) {
      yield {
        ...row,
        sourceRank: row.sourceRank ?? options.sourceRank ?? 0
      };
      continue;
    }

    const canonical = canonicalize(row, fallbackEvent, options.sourceRank ?? 0);
    if (canonical) {
      yield canonical;
    }
  }
}

async function copyRows(rows: AsyncIterable<CanonicalRow>, copyStream: NodeJS.WritableStream) {
  let inserted = 0;

  async function* lines() {
    for await (const row of rows) {
      inserted += 1;
      yield `${toCsvLine([
        row.learnerKey,
        row.eventLabel,
        row.name,
        row.fatherName,
        row.dob,
        row.internalMarks,
        row.theoryMarks,
        row.totalMarks,
        row.result,
        row.itgkCode,
        row.sourceRank,
        JSON.stringify(row.extra ?? {}),
        row.rollNumber,
        row.examCentre,
        row.mobile,
        row.itgkName,
        row.spCentre,
        row.barcode,
        row.bookletSeries
      ])}\n`;
    }
  }

  await pipeline(Readable.from(lines()), copyStream);
  return inserted;
}

async function* toAsync<T>(rows: Iterable<T> | AsyncIterable<T>): AsyncIterable<T> {
  yield* rows;
}

function isCanonicalRow(row: CanonicalRow | RawRow): row is CanonicalRow {
  return typeof row.learnerKey === "string" && typeof row.eventLabel === "string";
}

function toCsvLine(values: unknown[]) {
  return values.map(csvCell).join(",");
}

function csvCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
