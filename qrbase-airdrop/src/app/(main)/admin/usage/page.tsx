"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SESSION_KEY = "admin_verified";

interface EndpointAgg {
  endpoint: string;
  requestCount: number;
  queryCount: number;
  avgRequestMs: number;
  avgQueryMs: number;
}
interface SourceAgg {
  sourceType: string;
  requestCount: number;
  queryCount: number;
}
interface CallerAgg {
  sourceType: string;
  userAgent: string;
  origin: string;
  ip: string;
  requestCount: number;
  queryCount: number;
}
interface RecentRequest {
  timestamp: number;
  method: string;
  route: string;
  sourceType: string;
  origin: string;
  ip: string;
  queryCount: number;
}
interface UsageResponse {
  range: { days: number; endpoint: string | null; source: string | null };
  totals: {
    today: { requests: number; operations: number };
    last7: { requests: number; operations: number };
    last30: { requests: number; operations: number };
  };
  cost: {
    freeOperations: number;
    costPer1000Operations: number;
    last30: { operations: number; billableOperations: number; estimatedCost: number };
    selectedRange: { operations: number; billableOperations: number; estimatedCost: number };
  };
  selected: {
    totalRequests: number;
    totalOperations: number;
    topEndpointsByQueries: EndpointAgg[];
    topEndpointsByRequests: EndpointAgg[];
    slowEndpoints: EndpointAgg[];
    sources: SourceAgg[];
    callers: CallerAgg[];
    recent: RecentRequest[];
  };
}

const SOURCE_LABELS: Record<string, string> = {
  platform_frontend: "Platform frontend",
  server_to_server: "Server-to-server",
  bot_or_unknown: "Bot / unknown",
};

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  platform_frontend:
    "Your own app — claim pages & admin opened in a browser or in-app webview (Farcaster/Twitter).",
  server_to_server:
    "A backend/script calling the API directly — no browser (includes the qrbase.xyz backend, cron jobs, integrations; may carry an API key).",
  bot_or_unknown:
    "Crawlers, scrapers, monitors, or traffic with no identifying signals.",
};

const num = (n: number) => n.toLocaleString();
const fmtTime = (ms: number) =>
  ms ? new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
const ms = (n: number) => `${n.toLocaleString()} ms`;
const usd = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl px-5 py-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function EndpointTable({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: EndpointAgg[];
  metric: "queryCount" | "requestCount" | "avgRequestMs";
}) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No data for this range.</p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.endpoint} className="flex items-center gap-3 px-5 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-800">
                {r.endpoint}
              </span>
              <span className="flex-shrink-0 text-sm font-mono font-semibold text-gray-900">
                {metric === "avgRequestMs"
                  ? ms(r.avgRequestMs)
                  : num(r[metric])}
              </span>
              <span className="hidden sm:block flex-shrink-0 w-28 text-right text-[11px] font-mono text-muted">
                {num(r.requestCount)} req · {num(r.queryCount)} ops
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsagePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState(7);
  const [endpoint, setEndpoint] = useState("");
  const [source, setSource] = useState("");
  const [caller, setCaller] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(SESSION_KEY)) router.replace("/admin/login");
    else setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const secret = localStorage.getItem(SESSION_KEY) ?? "";
      const params = new URLSearchParams({ days: String(days) });
      if (endpoint.trim()) params.set("endpoint", endpoint.trim());
      if (source) params.set("source", source);
      if (caller.trim()) params.set("caller", caller.trim());
      const res = await fetch(`/api/admin/usage?${params.toString()}`, {
        headers: { "x-admin-password": secret, "x-api-key": secret },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Unauthorized" : "Failed to load usage");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, [days, endpoint, source, caller]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="QRbase" className="h-8 w-auto" />
            <span className="font-bold text-base text-gray-900">
              QRbase <span className="text-primary">Usage</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-surface-muted border border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              ← Back to Admin
            </Link>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark border border-primary rounded-lg px-3 py-1.5 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date range</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm"
            >
              <option value={1}>Today</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm"
            >
              <option value="">All sources</option>
              <option value="platform_frontend">Platform frontend</option>
              <option value="server_to_server">Server-to-server</option>
              <option value="bot_or_unknown">Bot / unknown</option>
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Endpoint filter</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="e.g. /api/campaigns"
              className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-mono"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Caller filter (recent log)</label>
            <input
              type="text"
              value={caller}
              onChange={(e) => setCaller(e.target.value)}
              placeholder="e.g. worker:bitgrass"
              className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Requests */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Requests</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Stat label="Today" value={num(data.totals.today.requests)} />
                <Stat label="Last 7 days" value={num(data.totals.last7.requests)} />
                <Stat label="Last 30 days" value={num(data.totals.last30.requests)} />
              </div>
            </section>

            {/* Accelerate operations */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Estimated Prisma Accelerate operations
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Stat label="Today" value={num(data.totals.today.operations)} />
                <Stat label="Last 7 days" value={num(data.totals.last7.operations)} />
                <Stat label="Last 30 days" value={num(data.totals.last30.operations)} />
              </div>
            </section>

            {/* Cost */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Estimated cost (last 30 days)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat
                  label="Operations (30d)"
                  value={num(data.cost.last30.operations)}
                />
                <Stat
                  label="Free tier"
                  value={num(data.cost.freeOperations)}
                  sub="first ops free"
                />
                <Stat
                  label="Billable ops"
                  value={num(data.cost.last30.billableOperations)}
                  sub="after free tier"
                />
                <Stat
                  label="Est. overage cost"
                  value={usd(data.cost.last30.estimatedCost)}
                  sub={`@ ${usd(data.cost.costPer1000Operations)}/1k`}
                />
              </div>
              <p className="text-xs text-muted mt-3">
                Selected range ({data.range.days}d
                {data.range.source ? `, ${SOURCE_LABELS[data.range.source] ?? data.range.source}` : ""}
                {data.range.endpoint ? `, "${data.range.endpoint}"` : ""}): {num(data.selected.totalOperations)} ops
                · billable {num(data.cost.selectedRange.billableOperations)} ·{" "}
                {usd(data.cost.selectedRange.estimatedCost)}
              </p>
            </section>

            {/* Source breakdown */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Source breakdown</h2>
              <p className="text-xs text-muted mb-3">
                Where the traffic came from. Classified from request headers
                (User-Agent, Origin/Referer, Sec-Fetch). In-app webviews can strip
                headers, so this is a best-effort estimate.
              </p>
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2.5 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <span>Source</span>
                  <span className="w-24 text-right">Requests</span>
                  <span className="w-24 text-right">Operations</span>
                </div>
                {data.selected.sources.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">No data for this range.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {data.selected.sources.map((s) => (
                      <div
                        key={s.sourceType}
                        className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900">
                            {SOURCE_LABELS[s.sourceType] ?? s.sourceType}
                          </span>
                          {SOURCE_DESCRIPTIONS[s.sourceType] && (
                            <p className="text-xs text-muted mt-0.5">
                              {SOURCE_DESCRIPTIONS[s.sourceType]}
                            </p>
                          )}
                        </div>
                        <span className="w-24 text-right font-mono self-center">
                          {num(s.requestCount)}
                        </span>
                        <span className="w-24 text-right font-mono font-semibold self-center">
                          {num(s.queryCount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Who is calling */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Who is calling</h2>
              <p className="text-xs text-muted mb-3">
                Top callers by operations. For non-frontend sources this shows the
                full User-Agent and client IP so you can identify exactly what is
                hitting the API (e.g. a specific bot or monitor). Frontend rows are
                grouped (no per-user IP).
              </p>
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.6fr_1fr_auto_auto_auto] gap-3 px-5 py-2.5 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <span>Client (User-Agent)</span>
                  <span className="min-w-0">Source · Origin · IP</span>
                  <span className="w-16 text-right">Req</span>
                  <span className="w-16 text-right">Ops</span>
                  <span className="w-0" />
                </div>
                {data.selected.callers.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">No data for this range.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {data.selected.callers.map((c, i) => (
                      <div
                        key={`${c.sourceType}-${c.userAgent}-${c.ip}-${i}`}
                        className="grid grid-cols-[1.6fr_1fr_auto_auto_auto] gap-3 px-5 py-2.5 text-sm items-center"
                      >
                        <span className="font-mono text-xs text-gray-900 break-all" title={c.userAgent}>
                          {c.userAgent}
                        </span>
                        <span className="min-w-0 truncate text-xs text-muted" title={`${c.origin} · ${c.ip}`}>
                          {(SOURCE_LABELS[c.sourceType] ?? c.sourceType)} · {c.origin} · {c.ip}
                        </span>
                        <span className="w-16 text-right font-mono">{num(c.requestCount)}</span>
                        <span className="w-16 text-right font-mono font-semibold">{num(c.queryCount)}</span>
                        <span className="w-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Recent server/bot calls */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Recent server/bot calls
              </h2>
              <p className="text-xs text-muted mb-3">
                The most recent non-frontend requests — exact endpoint, caller, and
                timestamp. Use the &quot;Caller filter&quot; above (e.g.{" "}
                <span className="font-mono">worker:bitgrass</span>) to isolate one client.
              </p>
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[auto_auto_1fr_auto] gap-3 px-5 py-2.5 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <span className="w-36">Time</span>
                  <span className="w-14">Ops</span>
                  <span>Endpoint</span>
                  <span className="w-56">Caller · IP</span>
                </div>
                {data.selected.recent.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted">
                    No server/bot requests logged yet in this range.
                  </p>
                ) : (
                  <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
                    {data.selected.recent.map((r, i) => (
                      <div
                        key={`${r.timestamp}-${i}`}
                        className="grid grid-cols-[auto_auto_1fr_auto] gap-3 px-5 py-2 text-sm items-center"
                      >
                        <span className="w-36 text-xs font-mono text-muted">{fmtTime(r.timestamp)}</span>
                        <span className="w-14 text-xs font-mono font-semibold text-gray-900">{num(r.queryCount)}</span>
                        <span className="min-w-0 truncate font-mono text-xs text-gray-800">
                          {r.method} {r.route}
                        </span>
                        <span className="w-56 truncate text-xs text-muted" title={`${r.origin} · ${r.ip}`}>
                          {r.origin} · {r.ip}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Endpoint tables */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EndpointTable
                title="Top 10 endpoints by Accelerate operations"
                rows={data.selected.topEndpointsByQueries}
                metric="queryCount"
              />
              <EndpointTable
                title="Top 10 endpoints by requests"
                rows={data.selected.topEndpointsByRequests}
                metric="requestCount"
              />
              <EndpointTable
                title="Slowest endpoints (avg request time)"
                rows={data.selected.slowEndpoints}
                metric="avgRequestMs"
              />
            </section>

            <p className="text-xs text-muted border-t border-border pt-4">
              Usage shown here is measured inside the app and may not exactly match Prisma billing,
              but it helps identify which endpoints and sources are generating database queries.
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
