import { getRedisClient } from "@/lib/redis";
import { userAgentFamily, type SourceType } from "@/lib/usage/source";

// ---------------------------------------------------------------------------
// Compact, atomic usage aggregation in Upstash Redis.
//
// Tracking writes go to Redis (NOT Prisma) so the tracking system itself never
// adds Prisma Accelerate operations â€” which is the whole point of this feature.
// Each request performs a handful of atomic HINCRBY commands in a single
// pipeline (one round-trip). Data is bucketed per UTC day so 30-day reads stay
// to ~30 small HGETALLs, and keys auto-expire after the retention window.
//
// Key layout (per day, date = YYYYMMDD UTC):
//   usage:d:{date}:ep   hash  field = "{METHOD} {route}|{metric}"  metric in req|q|ms
//   usage:d:{date}:src  hash  field = "{sourceType}|{metric}"      metric in req|q
// ---------------------------------------------------------------------------

const FIELD_SEP = "|";
// Distinct separator for the 3-part caller field (sourceType / UA family /
// origin) so it can't collide with values that may contain "|".
const CALLER_SEP = "";

export interface UsageRecord {
  route: string;
  method: string;
  sourceType: SourceType;
  sourceOrigin: string;
  userAgent: string;
  clientIp: string;
  queryCount: number;
  totalQueryMs: number;
  requestMs: number;
}

// Replace control chars (incl. our separators) with spaces and bound length so
// a single header value can't corrupt the field encoding or blow up cardinality.
function sanitize(value: string, max: number): string {
  const s = value || "";
  let out = "";
  for (let i = 0; i < s.length && out.length < max; i++) {
    const code = s.charCodeAt(i);
    out += code < 32 || code === 127 ? " " : s[i];
  }
  return out.trim();
}

function retentionSeconds(): number {
  const days = Number(process.env.USAGE_RETENTION_DAYS || "35");
  return (Number.isFinite(days) && days > 0 ? days : 35) * 24 * 60 * 60;
}

function dayKey(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    String(date.getUTCDate()).padStart(2, "0")
  );
}

function epHashKey(day: string): string {
  return `usage:d:${day}:ep`;
}
function srcHashKey(day: string): string {
  return `usage:d:${day}:src`;
}
function callerHashKey(day: string): string {
  return `usage:d:${day}:caller`;
}

// Rolling log of recent NON-frontend (server/bot) requests, so the dashboard can
// show which endpoint each server-side caller hit and when. Capped in length so
// it can't grow unbounded; frontend traffic is excluded to keep it low-volume.
const RECENT_KEY = "usage:recent";
const RECENT_MAX = 500;

// Keep the origin compact and bounded so the caller hash can't blow up in
// cardinality (e.g. avoids pathological long/garbage values).
function compactOrigin(origin: string): string {
  return (origin || "(none)").slice(0, 60);
}

// Best-effort write. Never throws — tracking must not break request handling.
export async function recordUsage(record: UsageRecord): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  const day = dayKey(new Date());
  const ep = epHashKey(day);
  const src = srcHashKey(day);
  const caller = callerHashKey(day);
  const epField = `${record.method} ${record.route}`;
  // For our own frontend we only need a coarse UA family and no IP (it would be
  // high-cardinality across many users). For everything else (server/bot) we
  // keep the full User-Agent and client IP so suspicious callers are
  // identifiable. compactOrigin/sanitize bound length and strip separators.
  const isFrontend = record.sourceType === "platform_frontend";
  const uaLabel = isFrontend
    ? userAgentFamily(record.userAgent)
    : sanitize(record.userAgent, 90) || "(no user-agent)";
  const ipLabel = isFrontend ? "(frontend)" : sanitize(record.clientIp, 45) || "(no ip)";
  const callerField = `${record.sourceType}${CALLER_SEP}${uaLabel}${CALLER_SEP}${compactOrigin(record.sourceOrigin)}${CALLER_SEP}${ipLabel}`;
  const qms = Math.round(record.totalQueryMs);
  const reqMs = Math.round(record.requestMs);

  try {
    const pipe = redis.pipeline();
    pipe.hincrby(ep, `${epField}${FIELD_SEP}req`, 1);
    pipe.hincrby(ep, `${epField}${FIELD_SEP}q`, record.queryCount);
    pipe.hincrby(ep, `${epField}${FIELD_SEP}ms`, reqMs);
    pipe.hincrby(ep, `${epField}${FIELD_SEP}qms`, qms);
    pipe.hincrby(src, `${record.sourceType}${FIELD_SEP}req`, 1);
    pipe.hincrby(src, `${record.sourceType}${FIELD_SEP}q`, record.queryCount);
    // Caller detail: requests + operations per (source, UA family, origin).
    pipe.hincrby(caller, `${callerField}${FIELD_SEP}req`, 1);
    pipe.hincrby(caller, `${callerField}${FIELD_SEP}q`, record.queryCount);
    pipe.expire(ep, retentionSeconds());
    pipe.expire(src, retentionSeconds());
    pipe.expire(caller, retentionSeconds());
    // Per-request trace for server/bot callers: which endpoint + when.
    if (!isFrontend) {
      pipe.lpush(RECENT_KEY, {
        t: Date.now(),
        m: record.method,
        r: record.route,
        s: record.sourceType,
        o: compactOrigin(record.sourceOrigin),
        ip: ipLabel,
        q: record.queryCount,
      });
      pipe.ltrim(RECENT_KEY, 0, RECENT_MAX - 1);
      pipe.expire(RECENT_KEY, retentionSeconds());
    }
    await pipe.exec();
  } catch {
    // Swallow â€” Redis hiccups must not affect the API response.
  }
}

// ---------------------------------------------------------------------------
// Read side (dashboard aggregation)
// ---------------------------------------------------------------------------

export interface EndpointAgg {
  endpoint: string; // "{METHOD} {route}"
  requestCount: number;
  queryCount: number;
  totalRequestMs: number;
  totalQueryMs: number;
  avgRequestMs: number;
  avgQueryMs: number;
}

export interface SourceAgg {
  sourceType: string;
  requestCount: number;
  queryCount: number;
}

export interface UsageAggregate {
  totalRequests: number;
  totalOperations: number;
  endpoints: EndpointAgg[];
  sources: SourceAgg[];
}

export interface CallerAgg {
  sourceType: string;
  userAgent: string;
  origin: string;
  ip: string;
  requestCount: number;
  queryCount: number;
}

export interface RecentRequest {
  timestamp: number;
  method: string;
  route: string;
  sourceType: string;
  origin: string;
  ip: string;
  queryCount: number;
}

function lastNDays(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

function parseField(field: string): { name: string; metric: string } | null {
  const idx = field.lastIndexOf(FIELD_SEP);
  if (idx === -1) return null;
  return { name: field.slice(0, idx), metric: field.slice(idx + 1) };
}

// Aggregate raw daily hashes into per-endpoint / per-source totals over `days`.
// Optional case-insensitive substring filters on endpoint and source.
export async function getUsageAggregate(
  days: number,
  filters: { endpoint?: string; source?: string } = {}
): Promise<UsageAggregate> {
  const redis = getRedisClient();
  const empty: UsageAggregate = {
    totalRequests: 0,
    totalOperations: 0,
    endpoints: [],
    sources: [],
  };
  if (!redis) return empty;

  const dayList = lastNDays(Math.max(1, days));
  const epRaw = new Map<string, { req: number; q: number; ms: number; qms: number }>();
  const srcRaw = new Map<string, { req: number; q: number }>();

  try {
    const pipe = redis.pipeline();
    for (const day of dayList) {
      pipe.hgetall(epHashKey(day));
      pipe.hgetall(srcHashKey(day));
    }
    const results = (await pipe.exec()) as Array<Record<string, string> | null>;

    results.forEach((hash, i) => {
      if (!hash) return;
      const isEndpoint = i % 2 === 0;
      for (const [field, valueRaw] of Object.entries(hash)) {
        const parsed = parseField(field);
        if (!parsed) continue;
        const value = Number(valueRaw) || 0;
        if (isEndpoint) {
          const cur = epRaw.get(parsed.name) || { req: 0, q: 0, ms: 0, qms: 0 };
          if (parsed.metric === "req") cur.req += value;
          else if (parsed.metric === "q") cur.q += value;
          else if (parsed.metric === "ms") cur.ms += value;
          else if (parsed.metric === "qms") cur.qms += value;
          epRaw.set(parsed.name, cur);
        } else {
          const cur = srcRaw.get(parsed.name) || { req: 0, q: 0 };
          if (parsed.metric === "req") cur.req += value;
          else if (parsed.metric === "q") cur.q += value;
          srcRaw.set(parsed.name, cur);
        }
      }
    });
  } catch {
    return empty;
  }

  const endpointFilter = filters.endpoint?.toLowerCase();
  const sourceFilter = filters.source?.toLowerCase();

  const endpoints: EndpointAgg[] = [];
  for (const [endpoint, m] of epRaw) {
    if (endpointFilter && !endpoint.toLowerCase().includes(endpointFilter)) continue;
    endpoints.push({
      endpoint,
      requestCount: m.req,
      queryCount: m.q,
      totalRequestMs: m.ms,
      totalQueryMs: m.qms,
      avgRequestMs: m.req ? Math.round(m.ms / m.req) : 0,
      avgQueryMs: m.q ? Math.round(m.qms / m.q) : 0,
    });
  }

  const sources: SourceAgg[] = [];
  for (const [sourceType, m] of srcRaw) {
    if (sourceFilter && !sourceType.toLowerCase().includes(sourceFilter)) continue;
    sources.push({ sourceType, requestCount: m.req, queryCount: m.q });
  }

  const totalRequests = endpoints.reduce((s, e) => s + e.requestCount, 0);
  const totalOperations = endpoints.reduce((s, e) => s + e.queryCount, 0);

  return { totalRequests, totalOperations, endpoints, sources };
}

// Lightweight totals for a window (sums query counts = estimated Accelerate
// operations, and request counts). Reuses getUsageAggregate.
export async function getWindowTotals(
  days: number
): Promise<{ requests: number; operations: number }> {
  const agg = await getUsageAggregate(days);
  return { requests: agg.totalRequests, operations: agg.totalOperations };
}

// Who is calling, broken down by (source, UA family, origin) â€” so the dashboard
// can name exactly which clients drive usage (e.g. a node script from qrbase,
// an uptime monitor, etc.). Optional source filter; returns top `limit` by ops.
export async function getCallerBreakdown(
  days: number,
  filters: { source?: string } = {},
  limit = 20
): Promise<CallerAgg[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  const dayList = lastNDays(Math.max(1, days));
  const raw = new Map<string, { req: number; q: number }>();

  try {
    const pipe = redis.pipeline();
    for (const day of dayList) pipe.hgetall(callerHashKey(day));
    const results = (await pipe.exec()) as Array<Record<string, string> | null>;

    for (const hash of results) {
      if (!hash) continue;
      for (const [field, valueRaw] of Object.entries(hash)) {
        const parsed = parseField(field); // splits trailing |req / |q
        if (!parsed) continue;
        const cur = raw.get(parsed.name) || { req: 0, q: 0 };
        const value = Number(valueRaw) || 0;
        if (parsed.metric === "req") cur.req += value;
        else if (parsed.metric === "q") cur.q += value;
        raw.set(parsed.name, cur);
      }
    }
  } catch {
    return [];
  }

  const sourceFilter = filters.source?.toLowerCase();
  const callers: CallerAgg[] = [];
  for (const [name, m] of raw) {
    const parts = name.split(CALLER_SEP);
    const sourceType = parts[0] ?? "";
    const userAgent = parts[1] ?? "";
    const origin = parts[2] ?? "(none)";
    const ip = parts[3] ?? "";
    if (sourceFilter && sourceType.toLowerCase() !== sourceFilter) continue;
    callers.push({
      sourceType,
      userAgent: userAgent || "(no user-agent)",
      origin: origin || "(none)",
      ip: ip || "(n/a)",
      requestCount: m.req,
      queryCount: m.q,
    });
  }

  return callers.sort((a, b) => b.queryCount - a.queryCount || b.requestCount - a.requestCount).slice(0, limit);
}

// Recent server/bot requests (most recent first) — shows the exact endpoint and
// timestamp of each non-frontend call. Optional filters by source and by origin
// substring (e.g. "worker:bitgrass" to isolate one Worker).
export async function getRecentRequests(
  limit = 200,
  filters: { source?: string; origin?: string } = {}
): Promise<RecentRequest[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  let rows: unknown[] = [];
  try {
    rows = (await redis.lrange(RECENT_KEY, 0, Math.max(1, limit) - 1)) as unknown[];
  } catch {
    return [];
  }

  const originFilter = filters.origin?.toLowerCase();
  const out: RecentRequest[] = [];
  for (const row of rows) {
    let obj: Record<string, unknown> | null = null;
    if (typeof row === "string") {
      try {
        obj = JSON.parse(row);
      } catch {
        obj = null;
      }
    } else if (row && typeof row === "object") {
      obj = row as Record<string, unknown>;
    }
    if (!obj) continue;

    const rec: RecentRequest = {
      timestamp: Number(obj.t) || 0,
      method: String(obj.m ?? ""),
      route: String(obj.r ?? ""),
      sourceType: String(obj.s ?? ""),
      origin: String(obj.o ?? ""),
      ip: String(obj.ip ?? ""),
      queryCount: Number(obj.q) || 0,
    };
    if (filters.source && rec.sourceType !== filters.source) continue;
    if (originFilter && !rec.origin.toLowerCase().includes(originFilter)) continue;
    out.push(rec);
  }
  return out;
}
