import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const examEvents = pgTable(
  "exam_events",
  {
    id: serial("id").primaryKey(),
    year: integer("year"),
    month: integer("month"),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    labelUnique: uniqueIndex("exam_events_label_unique").on(table.label)
  })
);

export const sourceFiles = pgTable("source_files", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  tableName: text("table_name"),
  originalName: text("original_name"),
  rowCount: integer("row_count").default(0).notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull()
});

export const results = pgTable(
  "results",
  {
    id: serial("id").primaryKey(),
    learnerKey: text("learner_key").notNull(),
    examEventId: integer("exam_event_id")
      .notNull()
      .references(() => examEvents.id, { onDelete: "cascade" }),
    sourceFileId: integer("source_file_id").references(() => sourceFiles.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    fatherName: text("father_name"),
    dob: date("dob"),
    marksInternal: integer("marks_internal"),
    marksTheory: integer("marks_theory"),
    marksTotal: integer("marks_total"),
    resultStatus: text("result_status"),
    rollNumber: text("roll_number"),
    examCentre: text("exam_centre"),
    mobile: text("mobile"),
    itgkCode: text("itgk_code"),
    itgkName: text("itgk_name"),
    spCentre: text("sp_centre"),
    barcode: text("barcode"),
    bookletSeries: text("booklet_series"),
    sourceRank: integer("source_rank").default(0).notNull(),
    extra: jsonb("extra").$type<Record<string, unknown>>().default({}).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    learnerEventUnique: uniqueIndex("results_learner_event_unique").on(table.learnerKey, table.examEventId),
    learnerKeyIdx: index("results_learner_key_idx").on(table.learnerKey),
    nameFatherTrgmIdx: index("results_name_father_trgm_idx").using(
      "gin",
      sql`(name || ' ' || coalesce(father_name, '')) gin_trgm_ops`
    ),
    dobIdx: index("results_dob_idx").on(table.dob),
    eventIdx: index("results_event_idx").on(table.examEventId),
    resultStatusIdx: index("results_result_status_idx").on(table.resultStatus),
    itgkCodeIdx: index("results_itgk_code_idx").on(table.itgkCode),
    rollNumberIdx: index("results_roll_number_idx").on(table.rollNumber)
  })
);