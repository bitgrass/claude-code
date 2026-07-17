import type { NextRequest } from "next/server";

// Where a request originated from, used to answer "is this Accelerate usage my
// own frontend, a backend/server caller, or a bot?". (qrbase.xyz backend calls
// fall under server_to_server — there is no separate external bucket.)
export type SourceType =
  | "platform_frontend"
  | "server_to_server"
  | "bot_or_unknown";

export interface ClassifiedSource {
  type: SourceType;
  // Coarse origin host (no path/query) — safe to store, never includes secrets.
  origin: string;
}

const DEFAULT_PLATFORM_ORIGINS = ["https://airdrop.qrbase.xyz"];

function parseOriginList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const parsed = value
    .split(",")
    .map((entry) => normalizeHost(entry.trim()))
    .filter(Boolean);
  return parsed.length ? parsed : fallback;
}

// Reduce any origin/referer/host value to a bare lowercase host.
function normalizeHost(value: string): string {
  if (!value) return "";
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
  }
}

const BOT_UA = /(bot|crawl|spider|slurp|curl|wget|python-requests|axios|headless|monitor|pingdom|uptime)/i;

// Cloudflare's own network ranges. If the *client* IP (cf-connecting-ip) is one
// of these, the immediate caller is itself on Cloudflare — i.e. another Worker /
// Pages function calling us server-side (a normal visitor's cf-connecting-ip is
// their real ISP IP, never a Cloudflare IP).
const CLOUDFLARE_IPV6_PREFIXES = [
  "2400:cb00", "2606:4700", "2803:f800", "2405:b500",
  "2405:8100", "2a06:98c0", "2c0f:f248",
];

function isCloudflareIp(ip: string): boolean {
  if (!ip) return false;
  const lower = ip.toLowerCase();
  return CLOUDFLARE_IPV6_PREFIXES.some((p) => lower.startsWith(p));
}

// Coarse, low-cardinality label for a User-Agent so the dashboard can name the
// caller (e.g. "node", "axios", "Chrome", "bot/monitor") without storing the
// full, high-cardinality UA string (which carries version noise).
export function userAgentFamily(uaRaw: string): string {
  const ua = uaRaw || "";
  if (!ua) return "(no user-agent)";
  const lower = ua.toLowerCase();
  const libs: [RegExp, string][] = [
    [/curl/, "curl"],
    [/wget/, "wget"],
    [/python-requests|aiohttp|httpx|python/, "python"],
    [/axios/, "axios"],
    [/node-fetch|undici/, "node"],
    [/go-http-client/, "Go-http-client"],
    [/okhttp/, "okhttp"],
    [/\bjava\//, "Java"],
    [/postman/, "Postman"],
    [/headlesschrome|puppeteer|playwright/, "headless-browser"],
    [/bot|crawl|spider|slurp|monitor|pingdom|uptime|datadog|newrelic|checkly|better\s?uptime/, "bot/monitor"],
  ];
  for (const [re, label] of libs) if (re.test(lower)) return label;
  if (/edg\//.test(lower)) return "Edge";
  if (/opr\/|opera/.test(lower)) return "Opera";
  if (/chrome\//.test(lower)) return "Chrome";
  if (/firefox\//.test(lower)) return "Firefox";
  if (/applewebkit/.test(lower) && /safari\//.test(lower)) return "Safari";
  if (/mozilla/.test(lower)) return "Browser (other)";
  const token = ua.split(/[/\s]/)[0];
  return (token || "unknown").slice(0, 24);
}

export function classifySource(req: NextRequest): ClassifiedSource {
  const originHeader = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const ua = req.headers.get("user-agent") || "";
  // Sec-Fetch-Site is sent by all modern browsers and NOT by server-side fetch,
  // so it is the most reliable signal for "browser vs. server". Browsers also
  // omit the Origin header on same-origin GETs and may strip Referer, which is
  // why we cannot rely on Origin/Referer alone.
  const secFetchSite = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  const hasApiKey =
    Boolean(req.headers.get("x-api-key")) || Boolean(req.headers.get("x-admin-password"));
  // Cloudflare sets cf-worker to the calling Worker's zone on Worker-to-Worker
  // subrequests — a definitive "another Cloudflare Worker called us" signal that
  // also names the caller (e.g. "qrbase.xyz").
  const cfWorker = (req.headers.get("cf-worker") || "").trim().toLowerCase();
  const clientIp = (req.headers.get("cf-connecting-ip") || "").trim();

  const host = normalizeHost(originHeader) || normalizeHost(referer);

  const platformOrigins = parseOriginList(
    process.env.USAGE_KNOWN_PLATFORM_ORIGINS,
    DEFAULT_PLATFORM_ORIGINS
  );

  // A real browser/webview sends a "Mozilla/..."-style User-Agent. Server-side
  // callers (node/axios/curl/etc.) and bots do not. This is the key signal,
  // because in-app webviews (Farcaster/Twitter) frequently strip Origin,
  // Referer AND Sec-Fetch-* — leaving User-Agent as the only reliable tell.
  const isBrowserUA = /mozilla|applewebkit|gecko|chrome|safari|firefox|edg\/|opr\//i.test(ua);
  const isBot = BOT_UA.test(ua);

  // 0) A Cloudflare Worker calling us (Worker-to-Worker). Definitive server-side
  //    signal; the calling zone is named so it's no longer "unknown".
  if (cfWorker) {
    return { type: "server_to_server", origin: `worker:${cfWorker}` };
  }
  // 0b) No cf-worker header, but the client IP is a Cloudflare address → still a
  //     Cloudflare-hosted server calling us (not a browser visitor).
  if (isCloudflareIp(clientIp)) {
    return { type: "server_to_server", origin: host || "(cloudflare)" };
  }

  // 1) Explicit own-origin, or a same-site browser fetch (same-origin GETs send
  //    no Origin header but do set Sec-Fetch-Site).
  if (host && platformOrigins.includes(host)) {
    return { type: "platform_frontend", origin: host };
  }
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return { type: "platform_frontend", origin: host || "(same-origin)" };
  }

  // 2) Known bots/crawlers.
  if (isBot) {
    return { type: "bot_or_unknown", origin: host || "(bot)" };
  }

  // 3) A real browser/webview with no recognised origin. The only browser-served
  //    pages in this app are our own, so this is our frontend reached through an
  //    in-app webview / privacy browser that stripped the other headers — NOT a
  //    server. Cross-site browser requests to an unknown origin are excluded.
  if (isBrowserUA && secFetchSite !== "cross-site" && secFetchSite !== "none") {
    return { type: "platform_frontend", origin: host || "(webview)" };
  }

  // 4) Cross-site browser request to an origin we don't recognise.
  if (secFetchSite === "cross-site" || secFetchSite === "none") {
    return { type: "bot_or_unknown", origin: host || "(cross-site)" };
  }

  // 5) Non-browser caller (server-side fetch / API client / cron, incl. the
  //    qrbase.xyz backend), optionally carrying an API key.
  if (hasApiKey || ua) {
    return { type: "server_to_server", origin: host || "(none)" };
  }

  // 6) No User-Agent at all and nothing else to go on.
  return { type: "bot_or_unknown", origin: host || "(unknown)" };
}
