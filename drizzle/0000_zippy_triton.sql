CREATE TABLE "exam_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"year" integer,
	"month" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" serial PRIMARY KEY NOT NULL,
	"learner_key" text NOT NULL,
	"exam_event_id" integer NOT NULL,
	"source_file_id" integer,
	"name" text NOT NULL,
	"father_name" text,
	"dob" date,
	"result" text,
	"internal_marks" integer,
	"theory_marks" integer,
	"total_marks" integer,
	"roll_number" text,
	"exam_centre" text,
	"mobile" text,
	"itgk_code" text,
	"itgk_name" text,
	"barcode" text,
	"booklet_series" text,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"table_name" text,
	"original_name" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_exam_event_id_exam_events_id_fk" FOREIGN KEY ("exam_event_id") REFERENCES "public"."exam_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_source_file_id_source_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."source_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_events_label_unique" ON "exam_events" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "results_learner_event_unique" ON "results" USING btree ("learner_key","exam_event_id");--> statement-breakpoint
CREATE INDEX "results_learner_key_idx" ON "results" USING btree ("learner_key");--> statement-breakpoint
CREATE INDEX "results_name_idx" ON "results" USING btree ("name");--> statement-breakpoint
CREATE INDEX "results_dob_idx" ON "results" USING btree ("dob");--> statement-breakpoint
CREATE INDEX "results_event_idx" ON "results" USING btree ("exam_event_id");