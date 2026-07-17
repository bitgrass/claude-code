import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import {
  getUsageAggregate,
  getWindowTotals,
  getCallerBreakdown,
  getRecentRequests,
} from "@/lib/usage/store";
import {
  FREE_ACCELERATE_OPERATIONS,
  COST_PER_1000_OPERATIONS,
  billableOperations,
  estimatedCost,
} from "@/lib/usage/cost";

export const dynamic = "force-dynamic";

const TOP_N = 10;

// GET /api/admin/usage?days=7&endpoint=&source=
// Admin-only. Returns aggregated usage (never raw per-request logs) read from
// the Redis aggregates. Performs NO Prisma queries, so opening the dashboard
// does not itself add Accelerate operations.
//
// NOTE: intentionally not wrapped with withUsage — the dashboard's own reads
// should not pollute the usage metrics it is reporting on.
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(1, Number(searchParams.get("days")) || 7), 90);
  const endpoint = searchParams.get("endpoint")?.trim() || undefined;
  const source = searchParams.get("source")?.trim() || undefined;
  const caller = searchParams.get("caller")?.trim() || undefined;

  const [selected, today, last7, last30, callers, recent] = await Promise.all([
    getUsageAggregate(days, { endpoint, source }),
    getWindowTotals(1),
    getWindowTotals(7),
    getWindowTotals(30),
    getCallerBreakdown(days, { source }),
    getRecentRequests(200, { source, origin: caller }),
  ]);

  const byQueries = [...selected.endpoints]
    .sort((a, b) => b.queryCount - a.queryCount)
    .slice(0, TOP_N);
  const byRequests = [...selected.endpoints]
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, TOP_N);
  const slowest = [...selected.endpoints]
    .filter((e) => e.requestCount > 0)
    .sort((a, b) => b.avgRequestMs - a.avgRequestMs)
    .slice(0, TOP_N);
  const sources = [...selected.sources].sort((a, b) => b.queryCount - a.queryCount);

  return NextResponse.json(
    {
      range: { days, endpoint: endpoint ?? null, source: source ?? null },
      // Headline windows (unfiltered) — "operations" = estimated Accelerate ops.
      totals: {
        today: { requests: today.requests, operations: today.operations },
        last7: { requests: last7.requests, operations: last7.operations },
        last30: { requests: last30.requests, operations: last30.operations },
      },
      cost: {
        freeOperations: FREE_ACCELERATE_OPERATIONS,
        costPer1000Operations: COST_PER_1000_OPERATIONS,
        // Cost over the last 30 days — closest proxy to a monthly billing period.
        last30: {
          operations: last30.operations,
          billableOperations: billableOperations(last30.operations),
          estimatedCost: estimatedCost(last30.operations),
        },
        // Cost over the currently selected range (+filters).
        selectedRange: {
          operations: selected.totalOperations,
          billableOperations: billableOperations(selected.totalOperations),
          estimatedCost: estimatedCost(selected.totalOperations),
        },
      },
      selected: {
        totalRequests: selected.totalRequests,
        totalOperations: selected.totalOperations,
        topEndpointsByQueries: byQueries,
        topEndpointsByRequests: byRequests,
        slowEndpoints: slowest,
        sources,
        callers,
        recent,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
