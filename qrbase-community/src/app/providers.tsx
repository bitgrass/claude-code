"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          loginMethods: ["twitter"],
          appearance: {
            theme: "light",
            accentColor: "#0052FF",
          },
          embeddedWallets: { createOnLogin: "off" },
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
