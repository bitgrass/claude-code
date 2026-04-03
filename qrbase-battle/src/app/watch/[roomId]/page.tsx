"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { LivePuzzleBoard } from "@/components/LivePuzzleBoard";
import { seededShuffle, formatTime, parsePuzzleBoard } from "@/lib/battle-utils";
import { TEAMS, type Team } from "@/types/battle";
import type { BattleRow } from "@/lib/db";

const BATTLE_MS = 2 * 60 * 1000;
const DEFAULT_PUZZLE_GRADIENT: [string, string] = ["#64748b", "#9ca3af"];

const D = {
  bg: "#050714",
  card: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.08)",
  muted: "rgba(255,255,255,0.4)",
};

function PlayerCard({
  handle,
  photo,
  moves,
  solvedMs,
  isWinner,
  label,
}: {
  handle: string | null;
  photo: string | null;
  moves: number;
  solvedMs: number | null;
  isWinner: boolean;
  label: string;
}) {
  const color = label === "Player 1" ? "#3B82F6" : "#EF4444";
  return (
    <div
      className="rounded-2xl p-3 flex flex-col items-center gap-2"
      style={{
        background: isWinner ? `${color}12` : D.card,
        border: `1px solid ${isWinner ? `${color}50` : D.border}`,
        minWidth: 140,
      }}
    >
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: D.muted }}>
        {label}
      </span>
      {photo ? (
        <Image src={photo} alt={handle ?? "?"} width={44} height={44} className="rounded-full" style={{ border: `2px solid ${color}40` }} />
      ) : (
        <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white" style={{ background: color, fontSize: 18 }}>
          {(handle ?? "?")[0]?.toUpperCase()}
        </div>
      )}
      <p className="text-sm font-bold text-white truncate max-w-[120px]">@{handle ?? "?"}</p>
      <div className="flex gap-3 text-center">
        <div>
          <p className="text-xs font-black tabular-nums" style={{ color, fontFamily: "monospace" }}>{moves}</p>
          <p className="text-[9px]" style={{ color: D.muted }}>moves</p>
        </div>
        {solvedMs !== null && (
          <div>
            <p className="text-xs font-black" style={{ color: "#10B981", fontFamily: "monospace" }}>{formatTime(solvedMs)}</p>
            <p className="text-[9px]" style={{ color: D.muted }}>time</p>
          </div>
        )}
      </div>
      {isWinner && <span className="text-xs font-black" style={{ color: "#FCD34D" }}>Winner</span>}
      {solvedMs !== null && !isWinner && <span className="text-[10px]" style={{ color: D.muted }}>Solved</span>}
    </div>
  );
}

function WatchPageInner() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<BattleRow | null>(null);
  const [timeLeft, setTimeLeft] = useState(BATTLE_MS);
  const [puzzleGradient, setPuzzleGradient] = useState<[string, string]>(DEFAULT_PUZZLE_GRADIENT);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/battle/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.room) setRoom(data.room as BattleRow);
      } catch {
        // best-effort polling only
      }
    };

    poll();
    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (!room?.started_at || room.status !== "active") return;

    const tick = () => {
      const elapsed = Date.now() - new Date(room.started_at!).getTime();
      setTimeLeft(Math.max(0, BATTLE_MS - elapsed));
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [room?.started_at, room?.status]);

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
      setPuzzleGradient([p2Color, p1Color]);
    });

    return () => {
      cancelled = true;
    };
  }, [room?.player1_handle, room?.player1_platform, room?.player2_handle, room?.player2_platform]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: D.bg }}>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: "#6366f1", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const seedTiles = seededShuffle(room.tile_seed);
  const player1Tiles = parsePuzzleBoard(room.player1_board) ?? seedTiles;
  const player2Tiles = parsePuzzleBoard(room.player2_board) ?? seedTiles;

  const isActive = room.status === "active";
  const isDone = room.status === "done";
  const isUrgent = timeLeft < 30_000;
  const timerColor = isUrgent ? "#EF4444" : timeLeft < 60_000 ? "#F59E0B" : "#6366f1";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: D.bg }}>
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: "#080c1a", borderBottom: `1px solid ${D.border}` }}
      >
        <button onClick={() => router.push("/")} className="text-sm font-bold transition-colors" style={{ color: D.muted }}>
          Back
        </button>
        <div className="flex flex-col items-center">
          <span
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: "#6366f1", fontFamily: "monospace" }}
          >
            LIVE SPECTATOR
          </span>
          <span className="text-[10px]" style={{ color: D.muted }}>Room {roomId}</span>
        </div>
        <div
          className="text-2xl font-black tabular-nums"
          style={{ color: isDone ? D.muted : timerColor, fontFamily: "monospace", textShadow: isDone ? "none" : `0 0 15px ${timerColor}80` }}
        >
          {isDone ? "DONE" : isActive ? formatTime(timeLeft) : "WAITING"}
        </div>
      </div>

      <div className="flex justify-center gap-4 px-4 pt-4">
        <PlayerCard
          label="Player 1"
          handle={room.player1_handle}
          photo={room.player1_photo}
          moves={room.player1_moves}
          solvedMs={room.player1_solved_ms}
          isWinner={room.winner === room.player1_handle}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-2xl font-black" style={{ color: D.muted }}>VS</span>
          {isActive && (
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "#10B98120", color: "#10B981", border: "1px solid #10B98140" }}
            >
              LIVE
            </span>
          )}
        </div>
        <PlayerCard
          label="Player 2"
          handle={room.player2_handle}
          photo={room.player2_photo}
          moves={room.player2_moves}
          solvedMs={room.player2_solved_ms}
          isWinner={room.winner === room.player2_handle}
        />
      </div>

      {(isActive || isDone) && room.player2_handle ? (
        <div className="flex flex-col items-center gap-3 px-4 pb-6 pt-4">
          <p className="text-xs" style={{ color: D.muted }}>
            Live board states update as each player moves tiles.
          </p>
          <div className="flex gap-6 flex-wrap justify-center">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-bold" style={{ color: "#3B82F6" }}>@{room.player1_handle}</p>
              <LivePuzzleBoard tiles={player1Tiles} gradientColors={puzzleGradient} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-bold" style={{ color: "#EF4444" }}>@{room.player2_handle}</p>
              <LivePuzzleBoard tiles={player2Tiles} gradientColors={puzzleGradient} />
            </div>
          </div>
        </div>
      ) : room.status === "waiting" ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3" style={{ color: D.muted }}>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#6366f1", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-sm">Waiting for opponent to join...</p>
        </div>
      ) : null}
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#050714" }}>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: "#6366f1", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      }
    >
      <WatchPageInner />
    </Suspense>
  );
}
