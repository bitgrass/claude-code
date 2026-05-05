const CLAIM_SELECTOR = "0x57bc3d78";
const BURN_BATCH_SELECTOR = "0x6b20c454";
const GET_ACTIVE_CLAIM_CONDITION_ID_SELECTOR = "0x5ab063e8";
const GET_CLAIM_CONDITION_BY_ID_SELECTOR = "0xd45b28d7";

export const TRANSFER_SINGLE_TOPIC0 =
  "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
export const TRANSFER_BATCH_TOPIC0 =
  "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";
export const NATIVE_TOKEN_SENTINEL = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

function strip0x(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function toPaddedWord(hexNoPrefix: string): string {
  return hexNoPrefix.padStart(64, "0");
}

function toWordFromBigint(value: bigint): string {
  if (value < BigInt(0)) {
    throw new Error("Negative bigint is not supported in ABI encoding");
  }
  return toPaddedWord(value.toString(16));
}

export function normalizeAddress(value: string): string | null {
  const v = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) return null;
  return `0x${v.slice(2).toLowerCase()}`;
}

function toWordFromAddress(value: string): string {
  const normalized = normalizeAddress(value);
  if (!normalized) throw new Error(`Invalid address: ${value}`);
  return toPaddedWord(strip0x(normalized));
}

function wordAt(dataNoPrefix: string, wordIndex: number): string {
  const start = wordIndex * 64;
  const end = start + 64;
  if (end > dataNoPrefix.length) throw new Error("Out of range ABI word read");
  return dataNoPrefix.slice(start, end);
}

function bigintAt(dataNoPrefix: string, wordIndex: number): bigint {
  return BigInt(`0x${wordAt(dataNoPrefix, wordIndex)}`);
}

function addressAt(dataNoPrefix: string, wordIndex: number): string {
  const raw = wordAt(dataNoPrefix, wordIndex);
  return `0x${raw.slice(24).toLowerCase()}`;
}

function encodeUintArray(values: bigint[]): string {
  const head = toWordFromBigint(BigInt(values.length));
  const body = values.map((v) => toWordFromBigint(v)).join("");
  return `${head}${body}`;
}

export function hexToBigint(value: string): bigint {
  const v = strip0x(value.trim());
  if (!v) return BigInt(0);
  return BigInt(`0x${v}`);
}

export function encodeGetActiveClaimConditionIdCalldata(tokenId: bigint): string {
  return `${GET_ACTIVE_CLAIM_CONDITION_ID_SELECTOR}${toWordFromBigint(tokenId)}`;
}

export function encodeGetClaimConditionByIdCalldata(tokenId: bigint, conditionId: bigint): string {
  return `${GET_CLAIM_CONDITION_BY_ID_SELECTOR}${toWordFromBigint(tokenId)}${toWordFromBigint(conditionId)}`;
}

export function decodeClaimConditionPricing(callResultHex: string): { pricePerToken: bigint; currency: string } {
  const data = strip0x(callResultHex);
  if (data.length < 64) {
    throw new Error("Invalid claim condition response");
  }

  // getClaimConditionById returns a single tuple with a dynamic string field,
  // so the top-level return is an offset to the tuple body.
  const tupleOffsetWords = Number(bigintAt(data, 0) / BigInt(32));
  const tupleStart = tupleOffsetWords;
  const pricePerToken = bigintAt(data, tupleStart + 5);
  const currency = addressAt(data, tupleStart + 6);
  return { pricePerToken, currency };
}

export function encodeClaimCalldata(args: {
  receiver: string;
  tokenId: bigint;
  quantity: bigint;
  currency: string;
  pricePerToken: bigint;
}): string {
  if (args.quantity <= BigInt(0)) {
    throw new Error("Claim quantity must be greater than 0");
  }

  // allowlistProof = (proof=[], quantityLimitPerWallet=0, pricePerToken=0, currency=0x0)
  const allowlistTuple = [
    toWordFromBigint(BigInt(128)), // offset to proof array (relative to tuple start)
    toWordFromBigint(BigInt(0)),
    toWordFromBigint(BigInt(0)),
    toWordFromAddress(ZERO_ADDRESS),
    toWordFromBigint(BigInt(0)), // proof length
  ].join("");

  // _data = empty bytes
  const extraData = toWordFromBigint(BigInt(0));

  const headWords = [
    toWordFromAddress(args.receiver),
    toWordFromBigint(args.tokenId),
    toWordFromBigint(args.quantity),
    toWordFromAddress(args.currency),
    toWordFromBigint(args.pricePerToken),
    toWordFromBigint(BigInt(224)), // offset to allowlist tuple
    toWordFromBigint(BigInt(224) + BigInt(allowlistTuple.length / 2)), // offset to _data
  ].join("");

  return `0x${strip0x(CLAIM_SELECTOR)}${headWords}${allowlistTuple}${extraData}`;
}

export function encodeBurnBatchCalldata(account: string, tokenIds: bigint[], amounts: bigint[]): string {
  if (tokenIds.length === 0 || tokenIds.length !== amounts.length) {
    throw new Error("burnBatch requires equal non-empty tokenIds and amounts arrays");
  }

  const idsEncoded = encodeUintArray(tokenIds);
  const amountsEncoded = encodeUintArray(amounts);

  const idsOffset = BigInt(96);
  const amountsOffset = idsOffset + BigInt(idsEncoded.length / 2);

  const head = [
    toWordFromAddress(account),
    toWordFromBigint(idsOffset),
    toWordFromBigint(amountsOffset),
  ].join("");

  return `0x${strip0x(BURN_BATCH_SELECTOR)}${head}${idsEncoded}${amountsEncoded}`;
}

export function topicToAddress(topic: string): string | null {
  const raw = strip0x(topic);
  if (raw.length !== 64) return null;
  return `0x${raw.slice(24).toLowerCase()}`;
}

export function decodeTransferSingleData(dataHex: string): { id: bigint; value: bigint } | null {
  const data = strip0x(dataHex);
  if (data.length < 128) return null;
  try {
    return {
      id: bigintAt(data, 0),
      value: bigintAt(data, 1),
    };
  } catch {
    return null;
  }
}

export function decodeTransferBatchData(dataHex: string): { ids: bigint[]; values: bigint[] } | null {
  const data = strip0x(dataHex);
  if (data.length < 128) return null;

  try {
    const idsOffsetBytes = Number(bigintAt(data, 0));
    const valuesOffsetBytes = Number(bigintAt(data, 1));
    if (idsOffsetBytes % 32 !== 0 || valuesOffsetBytes % 32 !== 0) return null;

    const idsStartWord = idsOffsetBytes / 32;
    const valuesStartWord = valuesOffsetBytes / 32;

    const idsLen = Number(bigintAt(data, idsStartWord));
    const valuesLen = Number(bigintAt(data, valuesStartWord));
    if (idsLen < 0 || valuesLen < 0) return null;

    const ids: bigint[] = [];
    for (let i = 0; i < idsLen; i += 1) {
      ids.push(bigintAt(data, idsStartWord + 1 + i));
    }

    const values: bigint[] = [];
    for (let i = 0; i < valuesLen; i += 1) {
      values.push(bigintAt(data, valuesStartWord + 1 + i));
    }

    return { ids, values };
  } catch {
    return null;
  }
}
