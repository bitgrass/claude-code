import { createPublicClient, http, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

const rpcUrl = process.env.ALCHEMY_API_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<{ balance: bigint; decimals: number }> {
  const [balance, decimals] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [walletAddress as Address],
    }),
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_BALANCE_ABI,
      functionName: "decimals",
    }),
  ]);

  return { balance, decimals };
}
