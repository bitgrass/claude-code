import { createPublicClient, createWalletClient, http, fallback, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

const alchemyUrl = process.env.ALCHEMY_API_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : null;

// mainnet.base.org is always first — Moralis/Alchemy used if available but not relied upon
export const publicClient = createPublicClient({
  chain,
  transport: fallback([
    http("https://mainnet.base.org"),
    ...(alchemyUrl ? [http(alchemyUrl)] : []),
    ...(process.env.NEXT_PUBLIC_BASE_RPC_URL ? [http(process.env.NEXT_PUBLIC_BASE_RPC_URL)] : []),
  ]),
});

export function getRelayerWalletClient() {
  const pk = process.env.RELAYER_PRIVATE_KEY as Hex;
  if (!pk) throw new Error("RELAYER_PRIVATE_KEY not configured");
  return createWalletClient({
    account: privateKeyToAccount(pk),
    chain,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
  });
}

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || "") as Address;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913") as Address;
export const SCAN_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_SCAN_TOKEN_ADDRESS || "") as Address;

export const QRBASE_AIRDROP_ABI = [
  {
    inputs: [
      { name: "totalAmount", type: "uint256" },
      { name: "maxRecipients", type: "uint256" },
      { name: "tierAmounts", type: "uint256[]" },
    ],
    name: "createCampaign",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "twitterId", type: "string" },
      { name: "signature", type: "bytes" },
    ],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "userId", type: "string" },
      { name: "signature", type: "bytes" },
    ],
    name: "distributeReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "campaignId", type: "uint256" }],
    name: "closeCampaign",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "campaignId", type: "uint256" }],
    name: "getCampaign",
    outputs: [
      {
        components: [
          { name: "creator", type: "address" },
          { name: "totalDeposited", type: "uint256" },
          { name: "remainingAmount", type: "uint256" },
          { name: "maxRecipients", type: "uint256" },
          { name: "claimedCount", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "campaignId", type: "uint256" }],
    name: "getCampaignStatus",
    outputs: [
      { name: "slotsRemaining", type: "uint256" },
      { name: "nextRewardAmount", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "slotIndex", type: "uint256" },
    ],
    name: "getRewardForSlot",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "campaignId", type: "uint256" }],
    name: "getTierCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "wallet", type: "address" },
    ],
    name: "getClaimStatus",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "campaignCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "totalAmount", type: "uint256" },
      { indexed: false, name: "maxRecipients", type: "uint256" },
    ],
    name: "CampaignCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "twitterId", type: "string" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "slotNumber", type: "uint256" },
    ],
    name: "RewardClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: false, name: "remainingAmount", type: "uint256" },
    ],
    name: "CampaignClosed",
    type: "event",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
