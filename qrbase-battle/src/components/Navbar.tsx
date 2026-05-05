"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import Image from "next/image";

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.857L2.196 2.25h6.813l4.261 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function FarcasterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 1000 1000" fill="currentColor">
      <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
      <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
      <path d="M617.778 746.667C605.505 746.667 595.556 756.616 595.556 768.889V795.556H591.111C578.838 795.556 568.889 805.505 568.889 817.778V844.444H817.778V817.778C817.778 805.505 807.828 795.556 795.556 795.556H791.111V768.889C791.111 756.616 781.162 746.667 768.889 746.667V351.111H793.333L822.222 253.333H644.444V746.667H617.778Z" />
    </svg>
  );
}

function getPrimaryWalletAddress(user: any): string | null {
  const linkedAccounts = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const embedded = linkedAccounts.find(
    (a: any) => a?.type === "wallet" && a?.walletClientType === "privy" && a?.chainType === "ethereum"
  );
  const anyEthWallet = linkedAccounts.find((a: any) => a?.type === "wallet" && a?.chainType === "ethereum");
  const anyWallet = linkedAccounts.find((a: any) => a?.type === "wallet");
  return embedded?.address ?? anyEthWallet?.address ?? anyWallet?.address ?? user?.wallet?.address ?? null;
}

export function Navbar() {
  const router = useRouter();
  const { authenticated, user, login, logout } = usePrivy();
  const { identity, setIdentity, disconnect } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const [showAuthMenu, setShowAuthMenu] = useState(false);

  useEffect(() => {
    if (!authenticated || !user) return;

    const walletAddress = getPrimaryWalletAddress(user);
    if (user.twitter?.username) {
      setIdentity({
        handle: user.twitter.username,
        platform: "twitter",
        displayName: user.twitter.name || user.twitter.username,
        profilePhoto: user.twitter.profilePictureUrl || null,
        walletAddress,
      });
      return;
    }

    if (user.farcaster?.fid) {
      setIdentity({
        handle: user.farcaster.username || String(user.farcaster.fid),
        platform: "farcaster",
        displayName: user.farcaster.displayName || user.farcaster.username || String(user.farcaster.fid),
        profilePhoto: user.farcaster.pfp || null,
        walletAddress,
      });
    }
  }, [authenticated, user, setIdentity]);

  const handleDisconnect = () => {
    logout();
    disconnect();
    setShowAuthMenu(false);
  };

  return (
    <nav
      className="sticky top-0 z-50 flex items-center px-6 gap-4"
      style={{
        background: "var(--panel-bg)",
        borderBottom: "1px solid var(--border-soft)",
        height: "56px",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 flex-1">
        <Image src="/logo.svg" alt="QRbase" width={120} height={32} className="h-8 w-auto" style={{ filter: "var(--logo-filter)" }} />
        <span
          className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase"
          style={{
            background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            color: "#fff",
          }}
        >
          BATTLE
        </span>
      </div>

      <button
        onClick={() => router.push("/store")}
        className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide"
        style={{ background: "rgba(16,185,129,0.16)", border: "1px solid rgba(16,185,129,0.45)", color: "var(--text-main)" }}
      >
        Store
      </button>

      <button
        onClick={toggleTheme}
        className="flex items-center gap-2 px-2 py-1 rounded-full"
        aria-label="Toggle theme"
        title="Toggle theme"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text-main)" }}
      >
        <span className="text-[10px] font-black uppercase tracking-wide">
          {mounted ? (theme === "dark" ? "Dark" : "Light") : "Theme"}
        </span>
        <span
          className="relative inline-flex h-5 w-10 rounded-full transition-colors"
          style={{ background: theme === "dark" ? "rgba(59,130,246,0.35)" : "rgba(139,92,246,0.35)" }}
        >
          <span
            className="absolute top-[2px] left-[2px] h-4 w-4 rounded-full transition-transform"
            style={{
              background: "#fff",
              transform: theme === "dark" ? "translateX(0)" : "translateX(20px)",
            }}
          />
        </span>
      </button>

      {/* Auth */}
      <div className="relative">
        {identity ? (
          <button
            onClick={() => setShowAuthMenu((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-soft)",
            }}
          >
            {identity.profilePhoto ? (
              <Image
                src={identity.profilePhoto}
                alt={identity.handle}
                width={26}
                height={26}
                className="rounded-full"
                style={{ border: "2px solid rgba(var(--fg-rgb),0.15)" }}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: "#6366f1", color: "#fff" }}
              >
                {identity.handle[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-start leading-tight">
              <span className="text-xs font-bold">@{identity.handle}</span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-dim)" }}>
                {identity.platform === "twitter" ? <><XIcon /> Twitter</> : <><FarcasterIcon /> Farcaster</>}
              </span>
            </div>
            <span style={{ color: "var(--text-dim)", fontSize: 10 }}>v</span>
          </button>
        ) : (
          <button
            onClick={login}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all"
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-main)",
            }}
          >
            <XIcon />
            Sign in
          </button>
        )}

        {showAuthMenu && identity && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden"
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface-1)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>gm,</p>
              <p className="font-black text-sm">@{identity.handle}</p>
              {identity.walletAddress ? (
                <p className="text-[10px] font-mono mt-1 truncate" style={{ color: "var(--text-dim)" }}>
                  Wallet {identity.walletAddress.slice(0, 6)}...{identity.walletAddress.slice(-4)}
                </p>
              ) : (
                <p className="text-[10px] mt-1" style={{ color: "var(--text-dim)" }}>No wallet linked</p>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full text-left px-4 py-3 text-sm font-semibold transition-colors"
              style={{ color: "#EF4444" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
