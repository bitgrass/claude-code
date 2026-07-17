// ALS-free Prisma query meter.
//
// AsyncLocalStorage did not propagate into the Prisma client extension in the
// OpenNext/workerd runtime (query counts always came back 0), so instead of a
// request-scoped store we use a single process-global monotonic counter that
// the Prisma extension bumps on every operation. The request wrapper in
// `@/lib/usage/track` snapshots the counter before/after the handler and uses
// the delta as that request's query count.
//
// Pinned to globalThis so any duplicate copy of this module shares one counter.
export interface QueryMeter {
  count: number;
  totalMs: number;
  maxMs: number;
}

const globalForMeter = globalThis as unknown as {
  __qrbaseQueryMeter?: QueryMeter;
};

export const queryMeter: QueryMeter =
  globalForMeter.__qrbaseQueryMeter ??
  (globalForMeter.__qrbaseQueryMeter = { count: 0, totalMs: 0, maxMs: 0 });

// Called by the Prisma client extension for every operation.
export function recordPrismaQuery(durationMs: number): void {
  queryMeter.count += 1;
  queryMeter.totalMs += durationMs;
  if (durationMs > queryMeter.maxMs) queryMeter.maxMs = durationMs;
}
