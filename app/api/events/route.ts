// import { type NextRequest, NextResponse } from "next/server";
// import { requireAdminJson } from "@/lib/admin-access";
// import { isDatabaseConfigured } from "@/lib/db";
// import { listAccessExamEvents } from "@/lib/access-fallback";
// import { listExamEvents, listExamEventDistrictSummaries, listExamEventSummaries } from "@/lib/db/queries";

// export const dynamic = "force-dynamic";

// const CACHE_TTL_MS = 10 * 60 * 1000;
// const cacheHeaders = {
//   "Cache-Control": "private, max-age=60, stale-while-revalidate=540"
// };

// type CachedValue = {
//   expiresAt: number;
//   data: unknown;
//   pending?: Promise<unknown>;
// };

// const responseCache = new Map<string, CachedValue>();

// export async function GET(request: NextRequest) {
//   const unauthorized = await requireAdminJson();
//   if (unauthorized) return unauthorized;

//   const detail = request.nextUrl.searchParams.get("detail") ?? "list";
//   const eventId = Number(request.nextUrl.searchParams.get("eventId") ?? 0);

//   if (!isDatabaseConfigured()) {
//     const events = await listAccessExamEvents();
//     const data = detail === "summary" ? { events, summary: summarizeFallbackEvents(events) } : { events };
//     return NextResponse.json(data, { headers: cacheHeaders });
//   }

//   if (detail === "districts") {
//     if (!Number.isInteger(eventId) || eventId <= 0) {
//       return NextResponse.json({ error: "Valid eventId is required." }, { status: 400, headers: cacheHeaders });
//     }

//     const data = await readThroughCache(`districts:${eventId}`, () =>
//       listExamEventDistrictSummaries(eventId).then((districts) => ({ eventId, districts }))
//     );
//     return NextResponse.json(data, { headers: cacheHeaders });
//   }

//   try {
//     const data = await readThroughCache(detail === "summary" ? "summary" : "list", () =>
//       detail === "summary" ? listExamEventSummaries() : listExamEvents().then((events) => ({ events }))
//     );
//     return NextResponse.json(data, { headers: cacheHeaders });
//   } catch (error) {
//     const events = await listAccessExamEvents();
//     const data = detail === "summary" ? { events, summary: summarizeFallbackEvents(events) } : { events };
//     return NextResponse.json(
//       {
//         ...data,
//         warning: error instanceof Error ? error.message : "Database response failed. Showing fallback events."
//       },
//       { headers: cacheHeaders }
//     );
//   }
// }

// async function readThroughCache(key: string, load: () => Promise<unknown>) {
//   const now = Date.now();
//   const cached = responseCache.get(key);

//   if (cached && cached.expiresAt > now) {
//     return cached.data;
//   }

//   if (cached?.pending) {
//     return cached.pending;
//   }

//   const pending = load()
//     .then((data) => {
//       responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
//       return data;
//     })
//     .catch((error) => {
//       responseCache.delete(key);
//       throw error;
//     });

//   responseCache.set(key, { data: cached?.data ?? null, expiresAt: 0, pending });
//   return pending;
// }

// function summarizeFallbackEvents(events: Array<{ id: number }>) {
//   return {
//     events: events.length,
//     attempts: 0,
//     appeared: 0,
//     learners: 0,
//     withMarks: 0,
//     resultCounts: {
//       PASS: 0,
//       FAIL: 0,
//       ABSENT: 0,
//       UFM: 0,
//       RLW: 0,
//       OTHER: 0
//     },
//     passPercentage: 0
//   };
// }
import { type NextRequest, NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-access";
import { isDatabaseConfigured } from "@/lib/db";
import { listAccessExamEvents } from "@/lib/access-fallback";
import { listExamEvents, listExamEventDistrictSummaries, listExamEventSummaries } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 10 * 60 * 1000;
const cacheHeaders = {
  "Cache-Control": "private, max-age=60, stale-while-revalidate=540"
};

type CachedValue = {
  expiresAt: number;
  data: unknown;
  pending?: Promise<unknown>;
};

const responseCache = new Map<string, CachedValue>();

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminJson();
  if (unauthorized) return unauthorized;

  const detail = request.nextUrl.searchParams.get("detail") ?? "list";
  const eventId = Number(request.nextUrl.searchParams.get("eventId") ?? 0);

  console.log(`[API_EVENTS] Request received: detail=${detail}, eventId=${eventId}`);

  if (!isDatabaseConfigured()) {
    console.log("[API_EVENTS] Database not configured, using fallback events.");
    let events = await listAccessExamEvents();
    events = events.filter((e: any) => {
      const label = e.label?.toUpperCase().trim() || "";
      return label === "MARCH 2026";
    });
    const data = detail === "summary" ? { events, summary: summarizeFallbackEvents(events) } : { events };
    return NextResponse.json(data, { headers: cacheHeaders });
  }

  if (detail === "districts") {
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ error: "Valid eventId is required." }, { status: 400, headers: cacheHeaders });
    }

    const data = await readThroughCache(`districts:${eventId}`, () =>
      listExamEventDistrictSummaries(eventId).then((districts) => ({ eventId, districts }))
    );
    return NextResponse.json(data, { headers: cacheHeaders });
  }

  try {
    const data: any = await readThroughCache(detail === "summary" ? "summary" : "list", async () => {
      if (detail === "summary") {
        const summaryData: any = await listExamEventSummaries();
        console.log("[API_EVENTS] Raw summary data fetched from DB");
        
        if (summaryData && Array.isArray(summaryData.events)) {
          summaryData.events = summaryData.events.filter((e: any) => {
            const label = e.label?.toUpperCase().trim() || "";
            return label === "MARCH 2026";
          });
        } else if (Array.isArray(summaryData)) {
          return summaryData.filter((e: any) => {
            const label = e.label?.toUpperCase().trim() || "";
            return label === "MARCH 2026";
          });
        }
        return summaryData;
      } else {
        const res = await listExamEvents();
        console.log("[API_EVENTS] Raw list events fetched from DB");
        
        const eventsArray = (res as any).events || (Array.isArray(res) ? res : []);
        const filteredEvents = eventsArray.filter((e: any) => {
          const label = e.label?.toUpperCase().trim() || "";
          return label === "MARCH 2026";
        });
        return { events: filteredEvents };
      }
    });

    return NextResponse.json(data, { headers: cacheHeaders });
  } catch (error) {
    console.error("[API_EVENTS] Error in GET handler:", error);
    let events = await listAccessExamEvents();
    events = events.filter((e: any) => {
      const label = e.label?.toUpperCase().trim() || "";
      return label === "MARCH 2026";
    });
    const data = detail === "summary" ? { events, summary: summarizeFallbackEvents(events) } : { events };
    return NextResponse.json(
      {
        ...data,
        warning: error instanceof Error ? error.message : "Database response failed. Showing fallback events."
      },
      { headers: cacheHeaders }
    );
  }
}

async function readThroughCache(key: string, load: () => Promise<unknown>) {
  const now = Date.now();
  const cached = responseCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (cached?.pending) {
    return cached.pending;
  }

  const pending = load()
    .then((data) => {
      responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    })
    .catch((error) => {
      responseCache.delete(key);
      throw error;
    });

  responseCache.set(key, { data: cached?.data ?? null, expiresAt: 0, pending });
  return pending;
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