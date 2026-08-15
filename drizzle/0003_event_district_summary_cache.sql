CREATE TABLE IF NOT EXISTS "event_district_summaries" (
  "exam_event_id" integer NOT NULL REFERENCES "exam_events"("id") ON DELETE cascade,
  "district" text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "appeared" integer DEFAULT 0 NOT NULL,
  "pass" integer DEFAULT 0 NOT NULL,
  "fail" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_district_summaries_event_district_unique"
ON "event_district_summaries" USING btree ("exam_event_id", "district");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_district_summaries_event_idx"
ON "event_district_summaries" USING btree ("exam_event_id");
--> statement-breakpoint
INSERT INTO "event_district_summaries" (
  "exam_event_id",
  "district",
  "attempts",
  "appeared",
  "pass",
  "fail",
  "updated_at"
)
SELECT
  "exam_event_id",
  coalesce(
    nullif(upper("extra"->>'DISTRICT'), ''),
    nullif(upper("extra"->>'district'), ''),
    nullif(upper("extra"->>'ITGKDST'), ''),
    'NOT RECORDED'
  ) AS "district",
  count("id")::int AS "attempts",
  (count("id") FILTER (WHERE upper(coalesce("result_status", '')) <> 'ABSENT'))::int AS "appeared",
  (count("id") FILTER (WHERE upper(coalesce("result_status", '')) = 'PASS'))::int AS "pass",
  (count("id") FILTER (WHERE upper(coalesce("result_status", '')) = 'FAIL'))::int AS "fail",
  now()
FROM "results"
GROUP BY
  "exam_event_id",
  coalesce(
    nullif(upper("extra"->>'DISTRICT'), ''),
    nullif(upper("extra"->>'district'), ''),
    nullif(upper("extra"->>'ITGKDST'), ''),
    'NOT RECORDED'
  )
ON CONFLICT ("exam_event_id", "district") DO UPDATE SET
  "attempts" = excluded."attempts",
  "appeared" = excluded."appeared",
  "pass" = excluded."pass",
  "fail" = excluded."fail",
  "updated_at" = now();
