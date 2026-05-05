import { NextRequest, NextResponse } from "next/server";
import { STORE_ITEMS, isItemId } from "@/lib/items";
import { normalizeAddress } from "@/lib/erc1155-abi";
import { getErc1155ClaimConditionConfig, simulateClaimTransaction } from "@/lib/erc1155";
import { createThirdwebClient, getContract, encode } from "thirdweb";
import { base } from "thirdweb/chains";
import { claimTo } from "thirdweb/extensions/erc1155";

const BASE_CHAIN_ID = 8453;
const ALLOWANCE_ERROR_PREFIX = "ERC20 allowance too low.";

function getThirdwebClient() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  if (secretKey) return createThirdwebClient({ secretKey });
  const clientId = process.env.THIRDWEB_CLIENT_ID;
  if (clientId) return createThirdwebClient({ clientId });
  throw new Error("THIRDWEB_SECRET_KEY or THIRDWEB_CLIENT_ID is required");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
  const quantityRaw = body.quantity;
  const quantity = Number.isInteger(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;

  if (!isItemId(itemId)) {
    return NextResponse.json({ error: "invalid itemId" }, { status: 400 });
  }

  const receiver = normalizeAddress(walletAddress);
  if (!receiver) {
    return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  }

  const item = STORE_ITEMS.find((x) => x.id === itemId);
  if (!item?.nftContract || !item.nftTokenId) {
    return NextResponse.json({ error: "Item is not claimable on-chain" }, { status: 409 });
  }

  try {
    const client = getThirdwebClient();
    const contract = getContract({ client, chain: base, address: item.nftContract });

    const transaction = claimTo({
      contract,
      to: receiver,
      tokenId: BigInt(item.nftTokenId),
      quantity: BigInt(quantity),
    });

    const claimData = await encode(transaction);
    const valueProp = transaction.value;
    const rawValue = typeof valueProp === "function" ? await valueProp() : valueProp;
    const value = typeof rawValue === "bigint" ? rawValue : BigInt(0);
    const claimConfig = await getErc1155ClaimConditionConfig(item.nftContract, item.nftTokenId);
    const approvalAmount = claimConfig.pricePerToken * BigInt(quantity);

    const simulation = await simulateClaimTransaction({
      from: receiver,
      to: item.nftContract,
      data: claimData,
      value,
    });

    if (!simulation.ok && !simulation.reason.startsWith(ALLOWANCE_ERROR_PREFIX)) {
      return NextResponse.json({ error: `Claim would fail: ${simulation.reason}` }, { status: 409 });
    }

    return NextResponse.json({
      tx: {
        to: item.nftContract,
        data: claimData,
        value: `0x${value.toString(16)}`,
        chainId: BASE_CHAIN_ID,
      },
      approval: {
        required: !claimConfig.isNativeCurrency && approvalAmount > BigInt(0),
        tokenAddress: claimConfig.currency,
        spender: item.nftContract,
        amount: approvalAmount.toString(),
      },
      simulation: simulation.ok ? { ok: true } : { ok: false, reason: simulation.reason },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare claim transaction";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
