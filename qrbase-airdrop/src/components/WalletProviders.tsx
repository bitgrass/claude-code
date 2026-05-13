"use client";

import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { http, fallback } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";

const wagmiConfig = getDefaultConfig({
  appName: "QRbase Airdrop",
  projectId: "cb68aa160d53387a3792c26d8353a6c9",
  chains: [base],
  transports: {
    [base.id]: fallback([
      http("https://mainnet.base.org"),
      ...(process.env.NEXT_PUBLIC_BASE_RPC_URL ? [http(process.env.NEXT_PUBLIC_BASE_RPC_URL)] : []),
    ]),
  },
  ssr: true,
});

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#8B5CF6",
            borderRadius: "large",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
