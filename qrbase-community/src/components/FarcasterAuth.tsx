"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const FARCASTER_APP_ID =
  process.env.NEXT_PUBLIC_FARCASTER_PRIVY_APP_ID || "cmeifjj1400sakv0b2dn2fjz7";

function FarcasterLoginInner({ onClose }: { onClose: () => void }) {
  const { authenticated, user, login, logout } = usePrivy();
  const { setIdentity, identity } = useAuth();

  useEffect(() => {
    if (authenticated && user?.farcaster?.fid) {
      setIdentity({
        handle: user.farcaster.username || String(user.farcaster.fid),
        platform: "farcaster",
        displayName: user.farcaster.displayName || user.farcaster.username || "",
        profilePhoto: user.farcaster.pfp || null,
      });
      onClose();
    }
  }, [authenticated, user, setIdentity, onClose]);

  // If twitter is already connected via main privy, show farcaster option anyway
  if (authenticated && identity?.platform === "farcaster") return null;

  return (
    <button
      onClick={login}
      className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
        bg-purple-600 hover:bg-purple-700 text-white transition-all"
    >
      <svg width="16" height="16" viewBox="0 0 1000 1000" fill="currentColor">
        <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
        <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
        <path d="M617.778 746.667C605.505 746.667 595.556 756.616 595.556 768.889V795.556H591.111C578.838 795.556 568.889 805.505 568.889 817.778V844.444H817.778V817.778C817.778 805.505 807.828 795.556 795.556 795.556H791.111V768.889C791.111 756.616 781.162 746.667 768.889 746.667V351.111H793.333L822.222 253.333H644.444V746.667H617.778Z" />
      </svg>
      Farcaster
    </button>
  );
}

export function FarcasterAuthButton({ onClose }: { onClose: () => void }) {
  return (
    <PrivyProvider
      appId={FARCASTER_APP_ID}
      config={{
        loginMethods: ["farcaster"],
        appearance: { theme: "light", accentColor: "#8B5CF6" },
        embeddedWallets: { createOnLogin: "off" },
      }}
    >
      <FarcasterLoginInner onClose={onClose} />
    </PrivyProvider>
  );
}
