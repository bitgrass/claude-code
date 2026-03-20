import { type Hex, encodePacked, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY as Hex;

function getRelayerAccount() {
  if (!RELAYER_PRIVATE_KEY) throw new Error("RELAYER_PRIVATE_KEY not configured");
  return privateKeyToAccount(RELAYER_PRIVATE_KEY);
}

export function getSignerAddress(): string {
  return getRelayerAccount().address;
}

export async function signClaimAuthorization(
  campaignId: number,
  recipient: string,
  twitterId: string,
  amount: bigint
): Promise<string> {
  const account = getRelayerAccount();

  const messageHash = keccak256(
    encodePacked(
      ["uint256", "address", "string", "uint256"],
      [BigInt(campaignId), recipient as `0x${string}`, twitterId, amount]
    )
  );

  console.log("=== SIGNER DEBUG ===");
  console.log("signer address:", account.address);
  console.log("campaignId:", campaignId);
  console.log("recipient:", recipient);
  console.log("twitterId:", twitterId);
  console.log("amount:", amount.toString());
  console.log("messageHash:", messageHash);

  const signature = await account.signMessage({
    message: { raw: messageHash },
  });

  console.log("signature:", signature);

  return signature;
}
