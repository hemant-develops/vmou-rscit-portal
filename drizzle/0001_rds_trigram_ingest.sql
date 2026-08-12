CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'result'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'result_status'
  ) THEN
    ALTER TABLE "results" RENAME COLUMN "result" TO "result_status";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'internal_marks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'marks_internal'
  ) THEN
    ALTER TABLE "results" RENAME COLUMN "internal_marks" TO "marks_internal";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'theory_marks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'marks_theory'
  ) THEN
    ALTER TABLE "results" RENAME COLUMN "theory_marks" TO "marks_theory";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'total_marks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'results' AND column_name = 'marks_total'
  ) THEN
    ALTER TABLE "results" RENAME COLUMN "total_marks" TO "marks_total";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN IF NOT EXISTS "sp_centre" text;
--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN IF NOT EXISTS "source_rank" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "results_name_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "results_name_father_trgm_idx"
ON "results" USING gin ((name || ' ' || coalesce(father_name, '')) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "results_result_status_idx" ON "results" USING btree ("result_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "results_itgk_code_idx" ON "results" USING btree ("itgk_code");
