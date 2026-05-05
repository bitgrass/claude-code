"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useAuth } from "@/contexts/AuthContext";
import { useBattleStats } from "@/hooks/useBattleStats";
import { QRPuzzle } from "@/components/QRPuzzle";
import { seededShuffle, formatTime, serializePuzzleBoard } from "@/lib/battle-utils";
import { TEAMS, type Team } from "@/types/battle";
import type { BattleRow } from "@/lib/db";
import { ITEMS_COLLECTION_CONTRACT, STORE_ITEMS } from "@/lib/items";
import { wagmiConfig } from "@/lib/wagmi";
import { createThirdwebClient, getContract, encode } from "thirdweb";
import { prepareContractCall } from "thirdweb";
import { base } from "thirdweb/chains";

const thirdwebClient = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });

const BATTLE_MS = 2 * 60 * 1000;
const ROOM_POLL_MS_DEFAULT = 500;
const ROOM_POLL_MS_ACTIVE = 200;
const DEFAULT_PUZZLE_GRADIENT: [string, string] = ["#64748b", "#9ca3af"];
type ItemInventory = { spell_frost: number; shield_guard: number };
type BattleItemsState = { player1: ItemInventory; player2: ItemInventory };

const EMPTY_ITEMS: ItemInventory = { spell_frost: 0, shield_guard: 0 };

const D = {
  bg: "var(--app-bg)",
  panel: "var(--panel-bg)",
  card: "rgba(var(--fg-rgb),0.03)",
  border: "rgba(var(--fg-rgb),0.08)",
  muted: "rgba(var(--fg-rgb),0.4)",
  dim: "rgba(var(--fg-rgb),0.15)",
};

function Avatar({ photo, handle, size = 56, color = "#6366f1" }: { photo: string | null; handle: string; size?: number; color?: string }) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={handle}
        width={size}
        height={size}
        className="rounded-full"
        style={{ width: size, height: size, border: `2px solid ${color}40` }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-black"
      style={{ width: size, height: size, fontSize: size * 0.4, background: color }}
    >
      {handle[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function DotLoader() {
  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full animate-bounce"
          style={{ background: "#6366f1", animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function BattlePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { identity } = useAuth();
  const { wallets } = useWallets();
  const { stats, recordWin, recordLoss } = useBattleStats(identity?.handle ?? null, identity?.platform ?? "twitter");

  const roomIdParam = searchParams.get("room");

  type Phase = "setup" | "joining" | "waiting" | "countdown" | "playing" | "result";
  const [phase, setPhase] = useState<Phase>(roomIdParam ? "joining" : "setup");
  const [room, setRoom] = useState<BattleRow | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(BATTLE_MS);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [resultShown, setResultShown] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [puzzleGradient, setPuzzleGradient] = useState<[string, string]>(DEFAULT_PUZZLE_GRADIENT);
  const [battleItems, setBattleItems] = useState<BattleItemsState | null>(null);
  const [itemActionLoading, setItemActionLoading] = useState<"spell_frost" | "shield_guard" | null>(null);

  const gameOverRef = useRef(false);
  const solvedRef = useRef(false);
  const outcomeRecordedRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const myMovesRef = useRef<number>(0);
  const myBoardRef = useRef<(number | null)[] | null>(null);

  const myHandle = identity?.handle ?? "";
  const isPlayer1 = room?.player1_handle === myHandle;

  const mySolvedMs = room ? (isPlayer1 ? room.player1_solved_ms : room.player2_solved_ms) : null;
  const oppSolvedMs = room ? (isPlayer1 ? room.player2_solved_ms : room.player1_solved_ms) : null;
  const oppHandle = room ? (isPlayer1 ? room.player2_handle : room.player1_handle) : null;
  const oppPhoto = room ? (isPlayer1 ? room.player2_photo : room.player1_photo) : null;

  const teamColor = stats.team ? TEAMS[stats.team].color : "#6366f1";

  const applyOutcomeOnce = useCallback((winner: string | null | undefined) => {
    if (outcomeRecordedRef.current || !winner) return;
    if (winner === myHandle) {
      recordWin();
    } else {
      recordLoss();
    }
    outcomeRecordedRef.current = true;
  }, [myHandle, recordWin, recordLoss]);

  useEffect(() => {
    if (!room?.player1_handle || !room?.player2_handle) {
      setPuzzleGradient(DEFAULT_PUZZLE_GRADIENT);
      return;
    }

    let cancelled = false;

    const resolveTeam = async (handle: string, platform: string | null) => {
      try {
        const safePlatform = platform === "farcaster" ? "farcaster" : "twitter";
        const res = await fetch(`/api/player/${encodeURIComponent(handle)}?platform=${safePlatform}`);
        if (!res.ok) return null;
        const data = await res.json();
        return (data.player?.team as Team | null) ?? null;
      } catch {
        return null;
      }
    };

    Promise.all([
      resolveTeam(room.player1_handle, room.player1_platform),
      resolveTeam(room.player2_handle, room.player2_platform),
    ]).then(([p1Team, p2Team]) => {
      if (cancelled) return;
      const p1Color = p1Team ? TEAMS[p1Team].color : DEFAULT_PUZZLE_GRADIENT[0];
      const p2Color = p2Team ? TEAMS[p2Team].color : DEFAULT_PUZZLE_GRADIENT[1];
      // Blend from player2 -> player1 as requested.
      setPuzzleGradient([p2Color, p1Color]);
    });

    return () => {
      cancelled = true;
    };
  }, [room?.player1_handle, room?.player1_platform, room?.player2_handle, room?.player2_platform]);

  // Poll room state every 500ms
  useEffect(() => {
    if (!room?.id) return;
    const pollMs = phase === "playing" || phase === "countdown" ? ROOM_POLL_MS_ACTIVE : ROOM_POLL_MS_DEFAULT;
    const interval = setInterval(async () => {
      try {
        const shouldSyncProgress = phase !== "result" && (myMovesRef.current > 0 || myBoardRef.current !== null);
        const url = shouldSyncProgress
          ? (() => {
              const params = new URLSearchParams({
                handle: myHandle,
                moves: String(myMovesRef.current),
              });
              if (myBoardRef.current) {
                params.set("board", serializePuzzleBoard(myBoardRef.current));
              }
              return `/api/battle/${room.id}?${params.toString()}`;
            })()
          : `/api/battle/${room.id}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.room) setRoom(data.room as BattleRow);
        if (data.items) setBattleItems(data.items as BattleItemsState);
      } catch {}
    }, pollMs);
    return () => clearInterval(interval);
  }, [room?.id, phase, myHandle]);

  // React to room state changes
  useEffect(() => {
    if (!room) return;
    if (room.status === "waiting" && phase !== "waiting") setPhase("waiting");
    if (room.status === "active" && room.started_at && phase !== "countdown" && phase !== "playing") {
      const startAt = new Date(room.started_at).getTime();
      const now = Date.now();
      if (startAt - now > 0) {
        setPhase("countdown");
        startTimeRef.current = startAt;
      } else {
        setPhase("playing");
        startTimeRef.current = startAt;
      }
    }
    if (room.status === "done" && !resultShown) {
      gameOverRef.current = true;
      setResultShown(true);
      applyOutcomeOnce(room.winner);
      setPhase("result");
    }
  }, [room, phase, resultShown, applyOutcomeOnce]);

  // Auto-join if roomId in URL
  useEffect(() => {
    if (!roomIdParam || !identity || phase !== "joining") return;
    handleJoinRoom(roomIdParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdParam, identity]);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    const tick = () => {
      const ms = startTimeRef.current - Date.now();
      const sec = Math.ceil(ms / 1000);
      if (sec <= 0) { setCountdown(0); setPhase("playing"); }
      else setCountdown(sec);
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [phase]);

  // Timer + opponent progress
  useEffect(() => {
    if (phase !== "playing" || gameOverRef.current) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, BATTLE_MS - elapsed);
      setTimeLeft(remaining);
      setOpponentProgress(oppSolvedMs !== null ? 100 : Math.min(95, (elapsed / BATTLE_MS) * 100));
      if (remaining <= 0 && !gameOverRef.current) {
        gameOverRef.current = true;
        clearInterval(interval);
        if (!solvedRef.current) applyOutcomeOnce("timeout");
        setResultShown(true);
        setPhase("result");
      }
    }, 200);
    return () => clearInterval(interval);
  }, [phase, oppSolvedMs, applyOutcomeOnce]);

  const handleCreate = async () => {
    if (!identity) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/battle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: identity.handle,
          name: identity.displayName,
          photo: identity.profilePhoto,
          platform: identity.platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const roomRes = await fetch(`/api/battle/${data.roomId}`);
      const roomData = await roomRes.json();
      setRoom(roomData.room as BattleRow);
      if (roomData.items) setBattleItems(roomData.items as BattleItemsState);
      setPhase("waiting");
      window.history.replaceState({}, "", `/battle?room=${data.roomId}`);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleJoinRoom = useCallback(async (code: string) => {
    if (!identity) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/battle/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: code.toUpperCase().trim(),
          handle: identity.handle,
          name: identity.displayName,
          photo: identity.profilePhoto,
          platform: identity.platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.room as BattleRow);
      if (data.items) setBattleItems(data.items as BattleItemsState);
      window.history.replaceState({}, "", `/battle?room=${code.toUpperCase()}`);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [identity]);

  const handleSolve = useCallback(async (solveMs: number, _moves: number) => {
    if (gameOverRef.current || solvedRef.current || !room) return;
    solvedRef.current = true;
    gameOverRef.current = true;

    const optimisticRoom: BattleRow = isPlayer1
      ? {
          ...room,
          status: "done",
          player1_solved_ms: solveMs,
          winner: myHandle,
          winner_platform: identity?.platform ?? "twitter",
        }
      : {
          ...room,
          status: "done",
          player2_solved_ms: solveMs,
          winner: myHandle,
          winner_platform: identity?.platform ?? "twitter",
        };

    // Show result popup immediately on local solve; server response can refine final state.
    setRoom(optimisticRoom);
    setResultShown(true);
    setPhase("result");

    const progressParams = new URLSearchParams({
      handle: myHandle,
      moves: String(myMovesRef.current),
    });
    if (myBoardRef.current) {
      progressParams.set("board", serializePuzzleBoard(myBoardRef.current));
    }

    try {
      await fetch(`/api/battle/${room.id}?${progressParams.toString()}`);
    } catch {
      // best-effort sync; solve call below is authoritative
    }

    const solveRes = await fetch("/api/battle/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, handle: myHandle, platform: identity?.platform ?? "twitter", solvedMs: solveMs }),
    });
    if (solveRes.ok) {
      const data = await solveRes.json();
      if (data.room) {
        const confirmedRoom = data.room as BattleRow;
        setRoom(confirmedRoom);
        applyOutcomeOnce(confirmedRoom.winner);
      }
      return;
    }

    // Fallback: if solve call failed transiently, try to read latest room once.
    try {
      const roomRes = await fetch(`/api/battle/${room.id}`);
      if (roomRes.ok) {
        const data = await roomRes.json();
        if (data.room) {
          const confirmedRoom = data.room as BattleRow;
          setRoom(confirmedRoom);
          applyOutcomeOnce(confirmedRoom.winner);
        }
      }
    } catch {
      // keep optimistic result view
    }
  }, [room, myHandle, identity, isPlayer1, applyOutcomeOnce]);

  const handleUseItem = useCallback(async (itemId: "spell_frost" | "shield_guard") => {
    if (!room || !identity || itemActionLoading) return;
    setItemActionLoading(itemId);
    try {
      const itemConfig = STORE_ITEMS.find((item) => item.id === itemId);
      if (!itemConfig?.nftTokenId) {
        setError("Item is not configured on-chain");
        return;
      }

      const preferredAddress = identity.walletAddress?.toLowerCase();
      const embeddedWallet =
        wallets.find(
          (w) =>
            (w as any).walletClientType === "privy" &&
            (preferredAddress ? w.address.toLowerCase() === preferredAddress : true)
        ) ?? wallets.find((w) => (w as any).walletClientType === "privy");
      const connectedWallet =
        embeddedWallet ??
        wallets.find((w) => (preferredAddress ? w.address.toLowerCase() === preferredAddress : false)) ??
        wallets[0];
      if (!connectedWallet) {
        setError("No Privy wallet found");
        return;
      }

      await connectedWallet.switchChain(8453);
      const provider = await connectedWallet.getEthereumProvider();
      const walletAddress = connectedWallet.address;
      const nftContract = getContract({ client: thirdwebClient, chain: base, address: ITEMS_COLLECTION_CONTRACT });
      const burnTx = prepareContractCall({
        contract: nftContract,
        method: "function burnBatch(address account, uint256[] ids, uint256[] values)",
        params: [walletAddress, [BigInt(itemConfig.nftTokenId)], [BigInt(1)]],
      });
      const burnData = await encode(burnTx);

      const web3Provider = new ethers.providers.Web3Provider(provider as any, "any");
      const signer = web3Provider.getSigner(walletAddress);
      const burnTxResponse = await signer.sendTransaction({
        to: ITEMS_COLLECTION_CONTRACT,
        data: burnData,
        value: "0x0",
      });

      const burnReceipt = await waitForTransactionReceipt(wagmiConfig, {
        chainId: 8453,
        hash: burnTxResponse.hash as `0x${string}`,
        confirmations: 1,
      });
      if (burnReceipt.status !== "success") {
        setError("Burn transaction failed");
        return;
      }

      const res = await fetch("/api/battle/item/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          handle: identity.handle,
          platform: identity.platform,
          itemId,
          walletAddress,
          burnTxHash: burnReceipt.transactionHash ?? burnTxResponse.hash,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to use item");
        return;
      }
      if (data.room) setRoom(data.room as BattleRow);
      if (data.items) setBattleItems(data.items as BattleItemsState);
    } catch {
      setError("Failed to use item");
    } finally {
      setItemActionLoading(null);
    }
  }, [room, identity, itemActionLoading, wallets]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/battle?room=${room?.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playAgain = () => {
    gameOverRef.current = false;
    solvedRef.current = false;
    outcomeRecordedRef.current = false;
    myMovesRef.current = 0;
    myBoardRef.current = null;
    setRoom(null);
    setPhase("setup");
    setResultShown(false);
    setOpponentProgress(0);
    setTimeLeft(BATTLE_MS);
    setBattleItems(null);
    window.history.replaceState({}, "", "/battle");
  };

  const handleRematch = async () => {
    if (!identity || !room || rematchLoading) return;
    setError(null);
    setRematchLoading(true);
    try {
      const res = await fetch("/api/battle/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, handle: identity.handle, name: identity.displayName, photo: identity.profilePhoto, platform: identity.platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const nextRoom = data.room as BattleRow;
      if (!nextRoom) throw new Error("Missing rematch room payload");

      gameOverRef.current = false;
      solvedRef.current = false;
      outcomeRecordedRef.current = false;
      myMovesRef.current = 0;
      myBoardRef.current = null;
      setRoom(nextRoom);
      setResultShown(false);
      setOpponentProgress(0);
      setTimeLeft(BATTLE_MS);

      if (nextRoom.status === "active" && nextRoom.started_at) {
        const startAt = new Date(nextRoom.started_at).getTime();
        startTimeRef.current = startAt;
        setPhase(startAt - Date.now() > 0 ? "countdown" : "playing");
      } else if (nextRoom.status === "waiting") {
        setPhase("waiting");
      } else {
        setPhase("playing");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start rematch");
    } finally {
      setRematchLoading(false);
    }
  };

  //  Not signed in 
  if (!identity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6" style={{ background: D.bg }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
        >
          ?
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white mb-1">Sign in to Battle</p>
          <p className="text-sm" style={{ color: D.muted }}>You need an account to join the arena</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
          style={{ background: "rgba(var(--fg-rgb),0.08)", border: "1px solid rgba(var(--fg-rgb),0.12)" }}
        >
          Go Home
        </button>
      </div>
    );
  }

  //  Setup 
  if (phase === "setup" || (phase as string) === "joining") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6" style={{ background: D.bg }}>
        <div className="text-center">
          <h1
            className="text-4xl font-black mb-2"
            style={{
              fontFamily: "monospace",
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6, #10B981)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            BATTLE ARENA
          </h1>
          <p className="text-sm" style={{ color: D.muted }}>Create a room or join a friend</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              boxShadow: "0 0 30px rgba(99,102,241,0.45)",
            }}
          >
            {loading ? "Creating..." : "Create Battle Room"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: D.border }} />
            <span className="text-xs font-bold" style={{ color: D.muted }}>OR</span>
            <div className="flex-1 h-px" style={{ background: D.border }} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl font-mono font-bold text-lg tracking-widest text-center focus:outline-none uppercase transition-all"
              style={{
                background: D.card,
                border: `1px solid ${D.border}`,
                color: "#fff",
              }}
            />
            <button
              onClick={() => handleJoinRoom(joinCode)}
              disabled={joinCode.length < 6 || loading}
              className="px-5 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-30 transition-all"
              style={{ background: "rgba(var(--fg-rgb),0.08)", border: `1px solid ${D.border}` }}
            >
              Join
            </button>
          </div>

          {error && (
            <p className="text-center text-sm font-semibold" style={{ color: "#EF4444" }}>{error}</p>
          )}
        </div>

        <button
          onClick={() => router.push("/")}
          className="text-sm transition-colors"
          style={{ color: D.muted }}
        >
            Back to Home
        </button>
      </div>
    );
  }

  //  Waiting 
  if (phase === "waiting") {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/battle?room=${room?.id}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6" style={{ background: D.bg }}>
        <div className="text-center">
          <p
            className="text-xs font-black uppercase tracking-widest mb-3"
            style={{ color: D.muted, fontFamily: "monospace" }}
          >
            Waiting for opponent
          </p>
          <div
            className="px-8 py-4 rounded-2xl"
            style={{ background: D.card, border: `1px solid ${teamColor}40` }}
          >
            <span
              className="text-5xl font-black font-mono tracking-[0.4em]"
              style={{ color: teamColor, textShadow: `0 0 30px ${teamColor}60` }}
            >
              {room?.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Avatar photo={identity.profilePhoto} handle={identity.handle} size={64} color={teamColor} />
          <div className="flex flex-col items-center gap-1">
            <span className="font-black text-2xl" style={{ color: D.muted }}>VS</span>
            <DotLoader />
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ border: `3px dashed ${D.border}` }}
          >
            ?
          </div>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <p className="text-center text-xs" style={{ color: D.muted }}>Share link with your opponent:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-mono truncate focus:outline-none"
              style={{ background: D.card, border: `1px solid ${D.border}`, color: D.muted }}
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: teamColor, boxShadow: `0 0 15px ${teamColor}40` }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <button onClick={() => router.push("/")} className="text-sm transition-colors" style={{ color: D.muted }}>
          Cancel
        </button>
      </div>
    );
  }

  //  Countdown 
  if (phase === "countdown") {
    const cdColor = countdown === 0 ? "#10B981" : countdown === 1 ? "#EF4444" : teamColor;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-6" style={{ background: D.bg }}>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <Avatar photo={identity.profilePhoto} handle={identity.handle} size={60} color={teamColor} />
            <p className="font-bold text-sm text-white">@{identity.handle}</p>
          </div>
          <span className="font-black text-2xl" style={{ color: D.muted }}>VS</span>
          <div className="flex flex-col items-center gap-2">
            <Avatar photo={oppPhoto ?? null} handle={oppHandle ?? "?"} size={60} color="#6366f1" />
            <p className="font-bold text-sm text-white">@{oppHandle ?? "?"}</p>
          </div>
        </div>

        <div
          className="text-[120px] font-black leading-none tabular-nums"
          style={{
            fontFamily: "monospace",
            color: cdColor,
            textShadow: `0 0 60px ${cdColor}`,
          }}
        >
          {countdown === 0 ? "GO!" : countdown}
        </div>

        <p className="text-sm" style={{ color: D.muted }}>Reconstruct the QR code - 2 minutes</p>
      </div>
    );
  }

  //  Playing 
  if (phase === "playing" && room) {
    const isUrgent = timeLeft < 30_000;
    const timerColor = isUrgent ? "#EF4444" : timeLeft < 60_000 ? "#F59E0B" : teamColor;
    const tiles = seededShuffle(room.tile_seed);
    const myMoves = isPlayer1 ? room.player1_moves : room.player2_moves;
    const oppMoves = isPlayer1 ? room.player2_moves : room.player1_moves;
    const myInventory = battleItems ? (isPlayer1 ? battleItems.player1 : battleItems.player2) : EMPTY_ITEMS;
    const oppInventory = battleItems ? (isPlayer1 ? battleItems.player2 : battleItems.player1) : EMPTY_ITEMS;
    const nowTs = Date.now();
    const msUntil = (value: string | null) => (value ? Math.max(0, new Date(value).getTime() - nowTs) : 0);
    const myFrozenMs = msUntil(isPlayer1 ? room.player1_freeze_until : room.player2_freeze_until);
    const myBlurMs = msUntil(isPlayer1 ? room.player1_blur_until : room.player2_blur_until);
    const incomingSpellMs = msUntil(isPlayer1 ? room.player1_pending_spell_until : room.player2_pending_spell_until);
    const opponentCastingMs = msUntil(isPlayer1 ? room.player2_casting_until : room.player1_casting_until);
    const canUseSpell = myInventory.spell_frost > 0 && opponentCastingMs <= 0 && incomingSpellMs <= 0;
    const canUseShield = myInventory.shield_guard > 0 && (myFrozenMs > 0 || myBlurMs > 0 || incomingSpellMs > 0 || opponentCastingMs > 0);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-4" style={{ background: D.bg }}>
        {/* Header bar */}
        <div
          className="w-full max-w-[400px] flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ background: D.card, border: `1px solid ${D.border}` }}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: D.muted }}>You</span>
            <span className="font-bold text-sm text-white">@{identity.handle}</span>
            <span className="text-xs font-mono" style={{ color: teamColor }}>{myMoves} moves</span>
          </div>

          <div
            className="text-3xl font-black font-mono tabular-nums px-4"
            style={{
              color: timerColor,
              textShadow: `0 0 20px ${timerColor}80`,
              fontFamily: "monospace",
            }}
          >
            {formatTime(timeLeft)}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: D.muted }}>Opponent</span>
            <span className="font-bold text-sm text-white">@{oppHandle ?? "?"}</span>
            <span className="text-xs font-mono" style={{ color: oppSolvedMs !== null ? "#10B981" : "#EF4444" }}>
              {oppSolvedMs !== null ? "Solved!" : `${oppMoves} moves`}
            </span>
          </div>
        </div>

        {(opponentCastingMs > 0 || incomingSpellMs > 0 || myFrozenMs > 0) && (
          <div
            className="w-full max-w-[400px] rounded-xl px-4 py-2 text-xs font-bold text-center"
            style={{
              background:
                myFrozenMs > 0
                  ? "rgba(239,68,68,0.18)"
                  : incomingSpellMs > 0
                  ? "rgba(245,158,11,0.2)"
                  : "rgba(59,130,246,0.2)",
              border: "1px solid rgba(var(--fg-rgb),0.14)",
              color: "#fff",
            }}
          >
            {myFrozenMs > 0
              ? `You are frozen for ${(myFrozenMs / 1000).toFixed(1)}s`
              : incomingSpellMs > 0
              ? `Incoming Frost Hex ${(incomingSpellMs / 1000).toFixed(1)}s - use Shield now`
              : `Opponent is casting Frost Hex ${(opponentCastingMs / 1000).toFixed(1)}s`}
          </div>
        )}

        <div className="w-full max-w-[400px] grid grid-cols-2 gap-2">
          <div
            className="rounded-xl p-3"
            style={{ background: "rgba(var(--fg-rgb),0.03)", border: "1px solid rgba(var(--fg-rgb),0.08)" }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: D.muted }}>Your Items</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleUseItem("spell_frost")}
                disabled={!canUseSpell || itemActionLoading !== null}
                className="w-full rounded-lg px-2 py-2 text-left disabled:opacity-40"
                style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.5)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Frost Hex</span>
                  <span className="text-xs font-mono text-white">{myInventory.spell_frost}</span>
                </div>
              </button>
              <button
                onClick={() => handleUseItem("shield_guard")}
                disabled={!canUseShield || itemActionLoading !== null}
                className="w-full rounded-lg px-2 py-2 text-left disabled:opacity-40"
                style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Aegis Shield</span>
                  <span className="text-xs font-mono text-white">{myInventory.shield_guard}</span>
                </div>
              </button>
            </div>
          </div>

          <div
            className="rounded-xl p-3"
            style={{ background: "rgba(var(--fg-rgb),0.03)", border: "1px solid rgba(var(--fg-rgb),0.08)" }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: D.muted }}>Opponent Items</p>
            <div className="flex flex-col gap-2 text-xs text-white">
              <div className="flex items-center justify-between rounded-lg px-2 py-2" style={{ background: "rgba(59,130,246,0.16)" }}>
                <span className="font-bold">Frost Hex</span>
                <span className="font-mono">{oppInventory.spell_frost}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-2 py-2" style={{ background: "rgba(16,185,129,0.16)" }}>
                <span className="font-bold">Aegis Shield</span>
                <span className="font-mono">{oppInventory.shield_guard}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Opponent progress */}
        <div className="w-full max-w-[400px]">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: D.muted }}>
            <span>Opponent progress</span>
            <span>{oppSolvedMs !== null ? "Solved!" : `${Math.round(opponentProgress)}%`}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(var(--fg-rgb),0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${opponentProgress}%`,
                background: oppSolvedMs !== null ? "#10B981" : "#EF4444",
              }}
            />
          </div>
        </div>

        {/* Puzzle */}
        <QRPuzzle
          key={`${room.id}:${room.tile_seed}`}
          initialTiles={tiles}
          onSolve={handleSolve}
          startTime={startTimeRef.current}
          disabled={solvedRef.current || myFrozenMs > 0}
          blurred={myBlurMs > 0}
          frozenMs={myFrozenMs}
          gradientColors={puzzleGradient}
          onMove={(moves, board) => {
            myMovesRef.current = moves;
            myBoardRef.current = board;
          }}
        />

        <p className="text-xs text-center max-w-[360px]" style={{ color: D.muted }}>
          Click a tile adjacent to the empty slot to slide it. Reconstruct the QR code!
        </p>
      </div>
    );
  }

  //  Result 
  if (phase === "result" && room) {
    const won = room.winner === myHandle;
    const myMs = mySolvedMs;
    const prDelta = won ? 1 : (stats.pr > 0 ? -1 : 0);
    const teamData = stats.team ? TEAMS[stats.team] : null;
    const resultColor = won ? "#10B981" : "#EF4444";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6" style={{ background: D.bg }}>
        {/* Result card */}
        <div
          className="w-full max-w-md rounded-3xl p-8 text-center"
          style={{
            background: `${resultColor}08`,
            border: `1px solid ${resultColor}40`,
            boxShadow: `0 0 60px ${resultColor}15`,
          }}
        >
          <p className="text-5xl mb-3">{won ? "WIN" : "LOSS"}</p>
          <h2 className="text-4xl font-black mb-1" style={{ color: resultColor }}>
            {won ? "You Win!" : "You Lose!"}
          </h2>
          <p className="text-sm mb-8" style={{ color: D.muted }}>
            {won
              ? myMs !== null ? `Solved in ${formatTime(myMs)}` : "Opponent timed out"
              : room.winner === "timeout"
              ? "Time ran out"
              : `@${oppHandle} solved it first in ${oppSolvedMs !== null ? formatTime(oppSolvedMs) : "-"}`}
          </p>

          <div className="flex justify-center gap-6">
            {[
              { label: "PR Change", value: prDelta >= 0 ? `+${prDelta}` : `${prDelta}`, color: prDelta > 0 ? "#10B981" : prDelta < 0 ? "#EF4444" : D.muted },
              { label: "Total PR", value: `${Math.max(0, stats.pr)}`, color: "var(--text-main)" },
              { label: "Record", value: `${stats.wins}W / ${stats.losses}L`, color: "var(--text-main)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: D.muted }}>{label}</span>
                <span className="text-2xl font-black tabular-nums" style={{ color, fontFamily: "monospace" }}>{value}</span>
              </div>
            ))}
          </div>

          {teamData && (
            <p className="mt-5 text-sm font-bold" style={{ color: teamData.color }}>
              {teamData.label} - Team PR updated
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <button
            onClick={handleRematch}
            disabled={rematchLoading}
            className="w-full py-3 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-50"
            style={{
              background: "rgba(var(--fg-rgb),0.06)",
              border: `1px solid ${D.border}`,
            }}
          >
            {rematchLoading ? "Starting rematch..." : "Rematch"}
          </button>

          <div className="flex gap-3 w-full">
            <button
              onClick={playAgain}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all"
              style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", boxShadow: "0 0 20px rgba(99,102,241,0.45)" }}
            >
              New Battle
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all"
              style={{ background: "rgba(var(--fg-rgb),0.06)", border: `1px solid ${D.border}` }}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading / joining
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: D.bg }}>
      <DotLoader />
    </div>
  );
}

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--app-bg)" }}>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: "#6366f1", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      }
    >
      <BattlePageInner />
    </Suspense>
  );
}

