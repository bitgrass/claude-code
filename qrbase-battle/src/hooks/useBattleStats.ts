"use client";

import { useState, useEffect, useCallback } from "react";
import type { BattleStats, Team } from "@/types/battle";

const DEFAULT_STATS: BattleStats = { wins: 0, losses: 0, pr: 0, team: null };

export function useBattleStats(handle: string | null, platform = "twitter") {
  const [stats, setStats] = useState<BattleStats>(DEFAULT_STATS);

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/player/${encodeURIComponent(handle)}?platform=${platform}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.player) {
          setStats({
            wins: data.player.wins,
            losses: data.player.losses,
            pr: data.player.pr,
            team: data.player.team ?? null,
          });
        }
      })
      .catch(() => {});
  }, [handle, platform]);

  const setTeam = useCallback(
    async (team: Team | null, displayName?: string | null, photo?: string | null) => {
      if (!handle) return;
      const res = await fetch("/api/player/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, platform, team, displayName, photo }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.player) {
          setStats((prev) => ({ ...prev, team: data.player.team ?? null }));
        }
      }
    },
    [handle, platform]
  );

  // Optimistic updates — PR = wins − losses
  const recordWin = useCallback(() => {
    setStats((prev) => ({ ...prev, wins: prev.wins + 1, pr: prev.wins + 1 - prev.losses }));
  }, []);

  const recordLoss = useCallback(() => {
    setStats((prev) => ({ ...prev, losses: prev.losses + 1, pr: Math.max(0, prev.wins - (prev.losses + 1)) }));
  }, []);

  return { stats, setTeam, recordWin, recordLoss };
}
