import type { NextRequest } from "next/server";
import { queryMeter } from "@/lib/usage/context";
import { classifySource } from "@/lib/usage/source";
import { recordUsage } from "@/lib/usage/store";

// Cloudflare sets cf-connecting-ip to the real client IP; fall back to the first
// hop of x-forwarded-for. Used only in the admin usage dashboard.
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    ""
  );
}

// A Next.js App Router route handler. The second arg (route context with
// `params`) is optional and passed through untouched.
type RouteHandler = (req: NextRequest, ctx?: any) => Promise<Response> | Response;

function trackingEnabled(): boolean {
  // Default ON; set USAGE_TRACKING_ENABLED=false to disable entirely.
  return process.env.USAGE_TRACKING_ENABLED !== "false";
}

function sampled(): boolean {
  const rate = Number(process.env.USAGE_TRACKING_SAMPLE_RATE);
  if (!Number.isFinite(rate) || rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
}

// Wrap a route handler so every request is timed, its Prisma operations counted
// (by diffing the process-global query meter the db extension increments), its
// source classified, and a compact aggregate flushed to Redis.
//
// The meter is global, so under truly concurrent requests in the same isolate a
// query can be attributed to the wrong request. In practice the high-frequency
// endpoints (status/scan-progress) run ~0 queries (cache hits / proxy), and the
// query-heavy endpoints are low-frequency, so cross-attribution is minimal.
//
// `route` is an explicit, low-cardinality label (e.g. "/api/campaigns/[id]")
// so dynamic segments like campaign ids don't explode the metric space.
export function withUsage(route: string, handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?: any): Promise<Response> => {
    if (!trackingEnabled() || !sampled()) {
      return handler(req, ctx) as Promise<Response>;
    }

    const startCount = queryMeter.count;
    const startQueryMs = queryMeter.totalMs;
    const start = Date.now();

    try {
      return (await handler(req, ctx)) as Response;
    } finally {
      const requestMs = Date.now() - start;
      const queryCount = Math.max(0, queryMeter.count - startCount);
      const totalQueryMs = Math.max(0, queryMeter.totalMs - startQueryMs);
      const source = classifySource(req);
      // Await so the write reliably completes before the Worker isolate may be
      // suspended; recordUsage never throws. Cheap (one Redis pipeline).
      await recordUsage({
        route,
        method: req.method,
        sourceType: source.type,
        sourceOrigin: source.origin,
        userAgent: req.headers.get("user-agent") || "",
        clientIp: clientIp(req),
        queryCount,
        totalQueryMs,
        requestMs,
      });
    }
  };
}
