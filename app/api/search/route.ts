import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasAccessResultFile, searchAccessLearners } from "@/lib/access-fallback";
import { databaseErrorMessage } from "@/lib/db/errors";
import { isDatabaseConfigured } from "@/lib/db";
import { searchLearners } from "@/lib/db/queries";

const searchParamsSchema = z.object({
  q: z.string().optional().default(""),
  eventId: z.coerce.number().int().refine((value) => value !== 0, "Please select an exam event before searching.").optional(),
  result: z.string().optional().default("All"),
  dob: z.string().optional().default(""),
  offset: z.coerce.number().int().min(0).optional().default(0)
});

const searchPageSize = 100;

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};

export async function GET(request: NextRequest) {
  const started = performance.now();
  const result = searchParamsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid search parameters." }, { status: 400 });
  }

  const parsed = result.data;
  const hasFilter = parsed.q.trim() || parsed.eventId || parsed.result !== "All" || parsed.dob.trim();

  if (!hasFilter) {
    return NextResponse.json(
      { learners: [], hasMore: false, elapsedMs: 0 },
      { headers: noStoreHeaders }
    );
  }

  if (await hasAccessResultFile() || !isDatabaseConfigured()) {
    try {
      const search = await searchAccessLearners({
        q: parsed.q,
        eventId: parsed.eventId,
        result: parsed.result,
        dob: normalizeDate(parsed.dob),
        offset: parsed.offset,
        limit: searchPageSize
      });

      return NextResponse.json(
        {
          ...search,
          elapsedMs: Math.round(performance.now() - started)
        },
        { headers: noStoreHeaders }
      );
    } catch (error) {
      return NextResponse.json({ error: databaseErrorMessage(error) }, { status: 503, headers: noStoreHeaders });
    }
  }

  try {
    const search = await searchLearners({
      q: parsed.q,
      eventId: parsed.eventId,
      result: parsed.result,
      dob: normalizeDate(parsed.dob),
      offset: parsed.offset,
      limit: searchPageSize
    });

    return NextResponse.json(
      {
        ...search,
        elapsedMs: Math.round(performance.now() - started)
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    const search = await searchAccessLearners({
      q: parsed.q,
      eventId: parsed.eventId,
      result: parsed.result,
      dob: normalizeDate(parsed.dob),
      offset: parsed.offset,
      limit: searchPageSize
    });

    return NextResponse.json(
      {
        ...search,
        elapsedMs: Math.round(performance.now() - started),
        warning: databaseErrorMessage(error)
      },
      { headers: noStoreHeaders }
    );
  }
}

function normalizeDate(value: string) {
  const text = value.trim();
  if (!text) return "";

  const parts = text.split(/[/-]/).map((part) => part.padStart(2, "0"));
  if (parts.length !== 3) return text;

  if (parts[0].length === 4) {
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}
