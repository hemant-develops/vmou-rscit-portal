import { NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-access";
import { isDatabaseConfigured } from "@/lib/db";
import { listAccessExamEvents } from "@/lib/access-fallback";
import { listExamEventSummaries } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0"
};
// In-Memory Cache taaki ek baar data aane ke baad dubara heavy query na chale
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  const unauthorized = await requireAdminJson();
  if (unauthorized) return unauthorized;

  if (!isDatabaseConfigured()) {
    const events = await listAccessExamEvents();
    return NextResponse.json({ events, summary: summarizeFallbackEvents(events) }, { headers: noStoreHeaders });
  }

  // Cache check taaki page khulte hi instant response mile
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp < CACHE_TTL)) {
    return NextResponse.json(cachedData, { headers: noStoreHeaders });
  }
  try {
    // Yahan original summary function call hoga jo pass/fail counts laata hai
    const data = await listExamEventSummaries(); 
    cachedData = data;
    cacheTimestamp = now;
    return NextResponse.json(data, { headers: noStoreHeaders });
  } catch (error) {
    const events = await listAccessExamEvents();
    return NextResponse.json(
      {
        events,
        summary: summarizeFallbackEvents(events)
      },
      { headers: noStoreHeaders }
    );
  }
}
function summarizeFallbackEvents(events: Array<{ id: number }>) {
  return {
    events: events.length,
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
    },
    passPercentage: 0
  };
}