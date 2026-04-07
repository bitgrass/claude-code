import type { Team } from "@/types/battle";

const COLLECTION_ADDRESS = "0x13e8874182abf64118fe9ab29582f6688521aa88";
const MORALIS_BASE_URL = process.env.MORALIS_BASE_URL ?? "https://deep-index.moralis.io/api/v2.2";
const MORALIS_CHAIN = "base";

const HTTP_RETRIES = 3;
const VERIFY_CACHE_MS = 2 * 60 * 1000;
const RETRYABLE_CACHE_MS = 12 * 1000;

type TeamGateResult =
  | { allowed: true }
  | { allowed: false; reason: string; retryable?: boolean };

type CacheEntry = {
  expiresAt: number;
  value: TeamGateResult;
};

const verifyCache = new Map<string, CacheEntry>();

class RetryableGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableGateError";
  }
}

type MoralisNft = {
  token_id?: string;
  normalized_metadata?: unknown;
  metadata?: unknown;
};

type MoralisWalletResponse = {
  result?: MoralisNft[];
};

type MoralisTokenResponse = {
  normalized_metadata?: unknown;
  metadata?: unknown;
};

function normalizeAddress(value: string): string | null {
  if (!value) return null;
  const addr = value.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(addr)) return null;
  return addr;
}

function getMoralisApiKey(): string {
  return (process.env.MORALIS_API_KEY ?? "").trim();
}

function isRetryableMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("429") ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("temporar") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("fetch failed") ||
    m.includes("econnreset") ||
    m.includes("enotfound") ||
    m.includes("503") ||
    m.includes("502") ||
    m.includes("504")
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function moralisGet<T>(
  path: string,
  params: Record<string, string>,
  apiKey: string
): Promise<T> {
  const query = new URLSearchParams({
    chain: MORALIS_CHAIN,
    format: "decimal",
    normalizeMetadata: "true",
    ...params,
  });
  const url = `${MORALIS_BASE_URL}${path}?${query.toString()}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < HTTP_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "X-API-Key": apiKey },
        cache: "no-store",
      });

      if (response.status === 429 || response.status >= 500) {
        throw new RetryableGateError(`Moralis ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`Moralis HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      if (err instanceof RetryableGateError || isRetryableMessage(err.message)) {
        if (attempt < HTTP_RETRIES - 1) {
          await sleep(250 * (attempt + 1));
          continue;
        }
      }
      break;
    }
  }
  throw lastError ?? new Error("Moralis request failed");
}

async function getWalletCollectionNfts(wallet: string, apiKey: string): Promise<MoralisNft[]> {
  const data = await moralisGet<MoralisWalletResponse>(`/${wallet}/nft`, {
    token_addresses: COLLECTION_ADDRESS,
  }, apiKey);
  return Array.isArray(data.result) ? data.result : [];
}

function extractColorFromMetadata(metadata: unknown): string | null {
  if (!metadata) return null;
  let parsed: unknown = metadata;
  if (typeof metadata === "string") {
    try {
      parsed = JSON.parse(metadata);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { attributes?: unknown; color?: unknown };
  if (typeof obj.color === "string" && obj.color.trim()) {
    return obj.color.trim().toLowerCase();
  }
  if (!Array.isArray(obj.attributes)) return null;
  for (const item of obj.attributes) {
    if (!item || typeof item !== "object") continue;
    const attr = item as { trait_type?: unknown; traitType?: unknown; value?: unknown };
    const trait = String(attr.trait_type ?? attr.traitType ?? "").trim().toLowerCase();
    if (trait === "color") {
      const value = String(attr.value ?? "").trim().toLowerCase();
      if (value) return value;
    }
  }
  return null;
}

async function getTokenColor(tokenId: string, apiKey: string): Promise<string | null> {
  const data = await moralisGet<MoralisTokenResponse>(`/nft/${COLLECTION_ADDRESS}/${tokenId}`, {}, apiKey);
  return extractColorFromMetadata(data.normalized_metadata) ?? extractColorFromMetadata(data.metadata);
}

function cacheGet(key: string): TeamGateResult | null {
  const hit = verifyCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    verifyCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: TeamGateResult): TeamGateResult {
  const ttl = value.allowed || !value.retryable ? VERIFY_CACHE_MS : RETRYABLE_CACHE_MS;
  verifyCache.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
}

export async function verifyTeamGate(walletAddress: string, team: Team): Promise<TeamGateResult> {
  const wallet = normalizeAddress(walletAddress);
  if (!wallet) {
    return { allowed: false, reason: "Invalid wallet address from Privy" };
  }

  const apiKey = getMoralisApiKey();
  if (!apiKey) {
    return {
      allowed: false,
      reason: "MORALIS_API_KEY is missing on the server",
    };
  }

  const cacheKey = `${wallet}:${team}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    // 1) Fetch user's NFTs from the collection first.
    const nfts = await getWalletCollectionNfts(wallet, apiKey);
    if (nfts.length === 0) {
      return cacheSet(cacheKey, {
        allowed: false,
        reason: "No NFT from the required collection was found in this wallet",
      });
    }

    // 2) For each NFT token, fetch token details and read Color attribute.
    for (const nft of nfts) {
      const tokenId = (nft.token_id ?? "").trim();
      if (!tokenId) continue;
      const color = await getTokenColor(tokenId, apiKey);
      if (color === team) {
        return cacheSet(cacheKey, { allowed: true });
      }
    }

    return cacheSet(cacheKey, {
      allowed: false,
      reason: `You can't join the ${team} team with your current NFT. You need an NFT with ${team} team color to join this team.`,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err instanceof RetryableGateError || isRetryableMessage(err.message)) {
      return cacheSet(cacheKey, {
        allowed: false,
        retryable: true,
        reason: "Unable to verify NFT ownership right now (rate limited). Please retry in a few seconds.",
      });
    }
    return cacheSet(cacheKey, {
      allowed: false,
      reason: "Unable to verify NFT ownership",
    });
  }
}

export type { TeamGateResult };
