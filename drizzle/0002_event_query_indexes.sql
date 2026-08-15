CREATE INDEX IF NOT EXISTS "results_event_learner_idx" ON "results" USING btree ("exam_event_id", "learner_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "results_event_result_status_idx" ON "results" USING btree ("exam_event_id", "result_status");
