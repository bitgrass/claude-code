import { STORE_ITEMS } from "@/lib/items";
import type { ItemId } from "@/lib/items";
import {
  DEAD_ADDRESS,
  NATIVE_TOKEN_SENTINEL,
  TRANSFER_BATCH_TOPIC0,
  TRANSFER_SINGLE_TOPIC0,
  ZERO_ADDRESS,
  decodeClaimConditionPricing,
  decodeTransferBatchData,
  decodeTransferSingleData,
  encodeGetActiveClaimConditionIdCalldata,
  encodeGetClaimConditionByIdCalldata,
  hexToBigint,
  normalizeAddress,
  topicToAddress,
} from "@/lib/erc1155-abi";

const DEFAULT_RPC_URLS = [
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
  "https://base.llamarpc.com",
];

const BALANCE_OF_SELECTOR = "0x00fdd58e";
const ERC1155_URI_SELECTOR = "0x0e89341c";
const ERC721_TOKEN_URI_SELECTOR = "0xc87b56dd";
const ERC20_INSUFFICIENT_ALLOWANCE_SELECTOR = "0xfb8f41b2";
const ERC20_INSUFFICIENT_BALANCE_SELECTOR = "0xe450d38c";

interface RpcErrorPayload {
  code?: number;
  message?: string;
  data?: unknown;
}

interface RpcPayload<T> {
  result?: T;
  error?: RpcErrorPayload;
}

interface RpcLog {
  address: string;
  topics: string[];
  data: string;
}

interface RpcReceipt {
  status?: string;
  from?: string;
  to?: string | null;
  logs?: RpcLog[];
}

export interface Erc1155ClaimConditionConfig {
  activeConditionId: bigint;
  currency: string;
  pricePerToken: bigint;
  isNativeCurrency: boolean;
}

export interface BurnVerificationResult {
  ok: boolean;
  reason?: string;
}

export interface Erc1155TokenMetadata {
  tokenUri: string | null;
  metadataUri: string | null;
  imageUrl: string | null;
  name: string | null;
}

function getRpcUrls(): string[] {
  const fromList = (process.env.BASE_RPC_URLS ?? process.env.NEXT_PUBLIC_BASE_RPC_URLS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const single = (process.env.BASE_RPC_URL ?? process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "").trim();
  return [...new Set([...fromList, single, ...DEFAULT_RPC_URLS].filter(Boolean))];
}

function toPaddedHex(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

function normalizeTxHash(value: string): string | null {
  const v = value.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(v)) return null;
  return `0x${v.slice(2).toLowerCase()}`;
}

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < value.length; i += 2) {
    bytes[i / 2] = Number.parseInt(value.slice(i, i + 2), 16);
  }
  return bytes;
}

function decodeAbiString(callResultHex: string): string {
  const data = callResultHex.startsWith("0x") ? callResultHex.slice(2) : callResultHex;
  if (data.length < 128) {
    throw new Error("Invalid ABI string result");
  }

  const offsetBytes = Number(BigInt(`0x${data.slice(0, 64)}`));
  if (!Number.isFinite(offsetBytes) || offsetBytes < 0 || offsetBytes % 32 !== 0) {
    throw new Error("Invalid ABI string offset");
  }

  const offsetHex = offsetBytes * 2;
  if (data.length < offsetHex + 64) {
    throw new Error("ABI string length word out of range");
  }

  const length = Number(BigInt(`0x${data.slice(offsetHex, offsetHex + 64)}`));
  if (!Number.isFinite(length) || length < 0) {
    throw new Error("Invalid ABI string length");
  }

  const contentStart = offsetHex + 64;
  const contentEnd = contentStart + length * 2;
  if (data.length < contentEnd) {
    throw new Error("ABI string content out of range");
  }

  return new TextDecoder().decode(hexToBytes(data.slice(contentStart, contentEnd)));
}

function expandErc1155UriTemplate(uri: string, tokenId: bigint): string {
  const tokenHex = tokenId.toString(16).padStart(64, "0");
  return uri.replace(/\{id\}/gi, tokenHex);
}

export function resolveMetadataUri(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^ipfs:\/\/ipfs\//i.test(v)) {
    return `https://ipfs.io/ipfs/${v.slice("ipfs://ipfs/".length)}`;
  }
  if (/^ipfs:\/\//i.test(v)) {
    return `https://ipfs.io/ipfs/${v.slice("ipfs://".length)}`;
  }
  if (v.startsWith("//")) {
    return `https:${v}`;
  }
  return v;
}

function extractHexWord(data: string, wordIndex: number): string | null {
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  const offset = 8 + wordIndex * 64;
  const word = hex.slice(offset, offset + 64);
  return word.length === 64 ? word : null;
}

function decodeKnownRevertError(raw: string): string | null {
  const matches = raw.match(/0x[a-fA-F0-9]{8,}/g);
  if (!matches?.length) return null;

  const data = matches[matches.length - 1].toLowerCase();

  if (data.startsWith(ERC20_INSUFFICIENT_ALLOWANCE_SELECTOR)) {
    const spenderWord = extractHexWord(data, 0);
    const allowanceWord = extractHexWord(data, 1);
    const neededWord = extractHexWord(data, 2);
    if (!spenderWord || !allowanceWord || !neededWord) return null;

    const spender = `0x${spenderWord.slice(24)}`;
    const allowance = BigInt(`0x${allowanceWord}`);
    const needed = BigInt(`0x${neededWord}`);
    return `ERC20 allowance too low. spender=${spender}, allowance=${allowance.toString()}, required=${needed.toString()}. Approve token spending first.`;
  }

  if (data.startsWith(ERC20_INSUFFICIENT_BALANCE_SELECTOR)) {
    const senderWord = extractHexWord(data, 0);
    const balanceWord = extractHexWord(data, 1);
    const neededWord = extractHexWord(data, 2);
    if (!senderWord || !balanceWord || !neededWord) return null;

    const sender = `0x${senderWord.slice(24)}`;
    const balance = BigInt(`0x${balanceWord}`);
    const needed = BigInt(`0x${neededWord}`);
    return `ERC20 balance too low. account=${sender}, balance=${balance.toString()}, required=${needed.toString()}.`;
  }

  return null;
}

async function rpcRequest<T>(method: string, params: unknown[]): Promise<T> {
  const urls = getRpcUrls();
  let lastErr: Error | null = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`RPC ${res.status}`);
      const payload = (await res.json()) as RpcPayload<T>;
      if (payload.error) {
        const message = payload.error.message ?? "RPC error";
        if (typeof payload.error.data === "string") {
          throw new Error(`${message} [data=${payload.error.data}]`);
        }
        throw new Error(message);
      }
      if (payload.result === undefined) throw new Error("Missing RPC result");
      return payload.result;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr ?? new Error(`RPC ${method} failed`);
}

async function rpcEthCall(contract: string, data: string): Promise<string> {
  return rpcRequest<string>("eth_call", [{ to: contract, data }, "latest"]);
}

async function getTransactionReceipt(txHash: string): Promise<RpcReceipt | null> {
  const normalized = normalizeTxHash(txHash);
  if (!normalized) return null;
  return rpcRequest<RpcReceipt | null>("eth_getTransactionReceipt", [normalized]);
}

export async function getErc1155Balance(
  contractAddress: string,
  walletAddress: string,
  tokenId: string
): Promise<bigint> {
  const contract = normalizeAddress(contractAddress);
  const wallet = normalizeAddress(walletAddress);
  const tokenIdBig = BigInt(tokenId);
  if (!contract || !wallet) return BigInt(0);

  const data = `${BALANCE_OF_SELECTOR}${wallet.slice(2).padStart(64, "0")}${toPaddedHex(tokenIdBig)}`;
  const result = await rpcEthCall(contract, data);
  const hex = result.startsWith("0x") ? result.slice(2) : result;
  if (!hex) return BigInt(0);
  return BigInt(`0x${hex}`);
}

export async function simulateClaimTransaction(args: {
  from: string;
  to: string;
  data: string;
  value: bigint;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const callParams: Record<string, string> = {
    from: args.from,
    to: args.to,
    data: args.data,
  };
  if (args.value > BigInt(0)) {
    callParams.value = `0x${args.value.toString(16)}`;
  }

  try {
    await rpcRequest<string>("eth_call", [callParams, "latest"]);
    return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const knownReason = decodeKnownRevertError(raw);
    if (knownReason) {
      return { ok: false, reason: knownReason };
    }
    // Strip common RPC prefixes to surface the contract-level reason
    const cleaned = raw
      .replace(/^execution reverted:?\s*/i, "")
      .replace(/^revert:?\s*/i, "")
      .trim();
    return { ok: false, reason: cleaned || raw };
  }
}

export async function getErc1155ClaimConditionConfig(
  contractAddress: string,
  tokenId: string
): Promise<Erc1155ClaimConditionConfig> {
  const contract = normalizeAddress(contractAddress);
  const tokenIdBig = BigInt(tokenId);
  if (!contract) {
    throw new Error("Invalid NFT contract address");
  }

  const activeResult = await rpcEthCall(contract, encodeGetActiveClaimConditionIdCalldata(tokenIdBig));
  const activeConditionId = hexToBigint(activeResult);

  const conditionResult = await rpcEthCall(
    contract,
    encodeGetClaimConditionByIdCalldata(tokenIdBig, activeConditionId)
  );
  const { currency, pricePerToken } = decodeClaimConditionPricing(conditionResult);

  return {
    activeConditionId,
    currency,
    pricePerToken,
    isNativeCurrency: currency.toLowerCase() === NATIVE_TOKEN_SENTINEL,
  };
}

export async function getErc1155TokenMetadata(
  contractAddress: string,
  tokenId: string
): Promise<Erc1155TokenMetadata> {
  const contract = normalizeAddress(contractAddress);
  if (!contract) {
    throw new Error("Invalid NFT contract address");
  }

  const tokenIdBig = BigInt(tokenId);
  const tokenIdWord = toPaddedHex(tokenIdBig);

  let tokenUriRaw: string;
  try {
    const uriResult = await rpcEthCall(contract, `${ERC1155_URI_SELECTOR}${tokenIdWord}`);
    tokenUriRaw = decodeAbiString(uriResult);
  } catch {
    const fallbackResult = await rpcEthCall(contract, `${ERC721_TOKEN_URI_SELECTOR}${tokenIdWord}`);
    tokenUriRaw = decodeAbiString(fallbackResult);
  }

  const expandedTokenUri = expandErc1155UriTemplate(tokenUriRaw, tokenIdBig);
  const metadataUri = resolveMetadataUri(expandedTokenUri);

  const metadataRes = await fetch(metadataUri, { cache: "no-store" });
  if (!metadataRes.ok) {
    throw new Error(`Metadata HTTP ${metadataRes.status}`);
  }
  const raw = (await metadataRes.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") {
    return {
      tokenUri: expandedTokenUri,
      metadataUri,
      imageUrl: null,
      name: null,
    };
  }

  const imageCandidate = raw.image ?? raw.image_url;
  const imageUrl = typeof imageCandidate === "string" ? resolveMetadataUri(imageCandidate) : null;
  const name = typeof raw.name === "string" ? raw.name : null;

  return {
    tokenUri: expandedTokenUri,
    metadataUri,
    imageUrl,
    name,
  };
}

function isBurnAddress(address: string | null): boolean {
  if (!address) return false;
  const normalized = normalizeAddress(address);
  return normalized === ZERO_ADDRESS || normalized === DEAD_ADDRESS;
}

export async function verifyErc1155BurnTransaction(args: {
  txHash: string;
  contractAddress: string;
  walletAddress: string;
  tokenId: string;
  minAmount?: bigint;
}): Promise<BurnVerificationResult> {
  const txHash = normalizeTxHash(args.txHash);
  const contract = normalizeAddress(args.contractAddress);
  const wallet = normalizeAddress(args.walletAddress);
  const tokenId = BigInt(args.tokenId);
  const minAmount = args.minAmount ?? BigInt(1);

  if (!txHash || !contract || !wallet || minAmount <= BigInt(0)) {
    return { ok: false, reason: "Invalid burn verification input" };
  }

  const receipt = await getTransactionReceipt(txHash);
  if (!receipt) {
    return { ok: false, reason: "Burn transaction not found on chain yet" };
  }

  if (receipt.status && hexToBigint(receipt.status) === BigInt(0)) {
    return { ok: false, reason: "Burn transaction reverted" };
  }

  const logs = Array.isArray(receipt.logs) ? receipt.logs : [];
  for (const log of logs) {
    if (normalizeAddress(log.address) !== contract) continue;
    const topic0 = (log.topics?.[0] ?? "").toLowerCase();

    if (topic0 === TRANSFER_SINGLE_TOPIC0) {
      const from = topicToAddress(log.topics?.[2] ?? "");
      const to = topicToAddress(log.topics?.[3] ?? "");
      const parsed = decodeTransferSingleData(log.data);
      if (!parsed) continue;
      if (from === wallet && isBurnAddress(to) && parsed.id === tokenId && parsed.value >= minAmount) {
        return { ok: true };
      }
      continue;
    }

    if (topic0 === TRANSFER_BATCH_TOPIC0) {
      const from = topicToAddress(log.topics?.[2] ?? "");
      const to = topicToAddress(log.topics?.[3] ?? "");
      if (from !== wallet || !isBurnAddress(to)) continue;

      const parsed = decodeTransferBatchData(log.data);
      if (!parsed) continue;

      const idx = parsed.ids.findIndex((id) => id === tokenId);
      if (idx >= 0 && (parsed.values[idx] ?? BigInt(0)) >= minAmount) {
        return { ok: true };
      }
    }
  }

  return { ok: false, reason: "No matching ERC1155 burn event found for this item" };
}

export async function getWalletItemBalances(walletAddress: string): Promise<Record<ItemId, number>> {
  const out: Record<ItemId, number> = {
    spell_frost: 0,
    shield_guard: 0,
  };

  for (const item of STORE_ITEMS) {
    if (!item.nftContract || !item.nftTokenId) continue;
    const bal = await getErc1155Balance(item.nftContract, walletAddress, item.nftTokenId);
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    const safe = bal > maxSafe ? Number.MAX_SAFE_INTEGER : Number(bal);
    out[item.id] = Math.max(0, safe);
  }

  return out;
}
