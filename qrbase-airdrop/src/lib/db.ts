import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { recordPrismaQuery } from "@/lib/usage/context";

// Cache the extended client at module scope. On Cloudflare Workers the module
// global persists for the lifetime of the isolate, so we create the Accelerate
// client once per isolate instead of once per request. Re-creating it on every
// getDb() call (the previous behaviour) wasted work and connections.
type ExtendedClient = ReturnType<typeof createBaseClient>;

let client: ExtendedClient | null = null;

// Prisma model delegates to count operations on. (Prisma client `query`
// extensions did NOT fire in the @prisma/client/edge + Accelerate + OpenNext
// bundle — counts always came back 0 — so we count via a thin Proxy instead,
// which does not depend on Prisma's extension machinery.)
const COUNTED_MODELS = new Set(["campaign", "claim"]);

function createBaseClient(url: string) {
  return new PrismaClient({ datasources: { db: { url } } }).$extends(
    withAccelerate()
  );
}

// Wrap a model delegate so each operation (findMany, count, create, ...) bumps
// the global query meter when its promise settles. Methods run with the real
// delegate as `this` to avoid Proxy/private-field issues.
function wrapModel<T extends object>(model: T): T {
  return new Proxy(model, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const start = Date.now();
        const result = (value as (...a: unknown[]) => unknown).apply(target, args);
        if (result && typeof (result as PromiseLike<unknown>).then === "function") {
          return (result as Promise<unknown>).then(
            (v) => {
              recordPrismaQuery(Date.now() - start);
              return v;
            },
            (e) => {
              recordPrismaQuery(Date.now() - start);
              throw e;
            }
          );
        }
        return result;
      };
    },
  });
}

function createClient(url: string): ExtendedClient {
  const base = createBaseClient(url);
  return new Proxy(base, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, target);
      if (typeof prop === "string" && COUNTED_MODELS.has(prop) && value) {
        return wrapModel(value as object);
      }
      return value;
    },
  }) as ExtendedClient;
}

export function getDb(): ExtendedClient {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  client = createClient(url);
  return client;
}
