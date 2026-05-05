import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim();

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(baseRpcUrl || undefined),
  },
});

