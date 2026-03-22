"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "wagmi/chains";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["twitter"],
        appearance: {
          theme: "light",
          accentColor: "#3B82F6",
          logo: "https://airdrop.qrbase.xyz/logo.png",
        },
        embeddedWallets: { createOnLogin: "off" },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
