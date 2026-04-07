"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useBattleStats } from "@/hooks/useBattleStats";
import { TEAMS } from "@/types/battle";
import type { Team } from "@/types/battle";
import { QRWarDisplay } from "@/components/QRWarDisplay";

const TEAM_EMOJIS: Record<Team, string> = {
  red: "🔴",
  blue: "🔵",
  green: "🟢",
};

interface TeamMember {
  handle: string;
  platform: string;
  display_name: string | null;
  photo: string | null;
  wins: number;
  losses: number;
  pr: number;
}

export default function Home() {
  const router = useRouter();
  const { identity } = useAuth();
  const { stats, setTeam } = useBattleStats(identity?.handle ?? null, identity?.platform ?? "twitter");
  const [teamPR, setTeamPR] = useState<Record<Team, number>>({ red: 0, blue: 0, green: 0 });
  const [teamMembers, setTeamMembers] = useState<Record<Team, number>>({ red: 0, blue: 0, green: 0 });
  const [myTeamMembers, setMyTeamMembers] = useState<TeamMember[]>([]);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [liveBattles, setLiveBattles] = useState<any[]>([]);
  const [teamActionError, setTeamActionError] = useState<string | null>(null);

  const refreshStandings = () => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => {
        if (data.standings) {
          setTeamPR({
            red: Math.max(0, data.standings.red?.total_pr ?? 0),
            blue: Math.max(0, data.standings.blue?.total_pr ?? 0),
            green: Math.max(0, data.standings.green?.total_pr ?? 0),
          });
          setTeamMembers({
            red: data.standings.red?.member_count ?? 0,
            blue: data.standings.blue?.member_count ?? 0,
            green: data.standings.green?.member_count ?? 0,
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    setMounted(true);
    refreshStandings();

    // Poll live battles every 3s
    const pollBattles = () => {
      fetch("/api/battle/active")
        .then((r) => r.json())
        .then((data) => { if (data.battles) setLiveBattles(data.battles); })
        .catch(() => {});
    };
    pollBattles();
    const interval = setInterval(pollBattles, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!stats.team) return;
    fetch(`/api/teams/${stats.team}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.members) {
          setMyTeamMembers(data.members);
        }
      })
      .catch(() => {});
  }, [stats.team]);

  const sortedTeams = (["red", "blue", "green"] as Team[]).sort(
    (a, b) => teamPR[b] - teamPR[a]
  );

  const totalPR = teamPR.red + teamPR.blue + teamPR.green;
  const maxPR = Math.max(teamPR.red, teamPR.blue, teamPR.green, 1);

  const handleCreate = () => {
    if (!identity) return;
    router.push("/battle");
  };

  const handleJoin = () => {
    if (!identity || joinCode.length < 6) return;
    router.push(`/battle?room=${joinCode.toUpperCase()}`);
  };

  const handleJoinTeam = (t: Team) => {
    if (!identity) return;
    setTeam(t, identity.displayName, identity.profilePhoto, identity.walletAddress).then((result) => {
      if (!result.ok) {
        setTeamActionError(result.error ?? "Unable to join team");
        return;
      }
      setTeamActionError(null);
      refreshStandings();
    });
  };

  const handleLeaveTeam = () => {
    if (!identity) return;
    setTeam(null, identity.displayName, identity.profilePhoto, identity.walletAddress).then((result) => {
      if (!result.ok) {
        setTeamActionError(result.error ?? "Unable to leave team");
        return;
      }
      setTeamActionError(null);
      refreshStandings();
      setMyTeamMembers([]);
    });
  };

  if (!mounted) return null;

  const userTeamColor = stats.team ? TEAMS[stats.team].color : "#6366f1";
  const displayedMembers = showAllMembers ? myTeamMembers : myTeamMembers.slice(0, 5);

  return (
    <div className="flex flex-col" style={{ background: "#050714", color: "#fff", minHeight: "calc(100vh - 56px)" }}>
      {/* Main content */}
      <main className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left Panel */}
        <div
          className="flex flex-col gap-4 p-4 overflow-y-auto"
          style={{
            width: "400px",
            minWidth: "400px",
            background: "#080c1a",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* User Card */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {identity ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  {identity.profilePhoto ? (
                    <Image
                      src={identity.profilePhoto}
                      alt={identity.handle}
                      width={44}
                      height={44}
                      className="rounded-full"
                      style={{ border: `2px solid ${userTeamColor}40` }}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-black"
                      style={{ background: userTeamColor }}
                    >
                      {identity.handle[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">@{identity.handle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        {identity.platform}
                      </span>
                      {stats.team && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: `${TEAMS[stats.team].color}20`,
                            color: TEAMS[stats.team].color,
                          }}
                        >
                          {TEAM_EMOJIS[stats.team]} {TEAMS[stats.team].label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Wins", value: stats.wins, color: "#10B981" },
                    { label: "Losses", value: stats.losses, color: "#EF4444" },
                    { label: "PR", value: stats.pr, color: userTeamColor },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3 text-center"
                      style={{ background: `${color}10`, border: `1px solid ${color}25` }}
                    >
                      <p
                        className="text-xl font-black tabular-nums"
                        style={{ color, fontFamily: "monospace" }}
                      >
                        {value}
                      </p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: `${color}80` }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
                >
                  ⚔️
                </div>
                <p className="font-bold text-white mb-1">Connect to Battle</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Sign in with X to join a clan and start battling
                </p>
              </div>
            )}
          </div>

          {/* Team Standings */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}
              >
                CLAN WAR
              </h2>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                PR = member wins − losses
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {sortedTeams.map((t, rank) => {
                const team = TEAMS[t];
                const isMyTeam = stats.team === t;
                const canJoinOrSwitch = !!identity && !isMyTeam;
                const pct = totalPR > 0 ? (teamPR[t] / totalPR) * 100 : 33.3;
                const strengthPct = (teamPR[t] / maxPR) * 100;

                return (
                  <div
                    key={t}
                    className="rounded-xl p-3"
                    style={{
                      background: isMyTeam ? `${team.color}12` : "rgba(255,255,255,0.02)",
                      border: isMyTeam
                        ? `1px solid ${team.color}40`
                        : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{TEAM_EMOJIS[t]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white truncate">{team.label}</span>
                          {isMyTeam && (
                            <span
                              className="text-[9px] font-black px-1 py-0.5 rounded uppercase tracking-wide"
                              style={{ background: team.color, color: "#fff" }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {teamMembers[t]} {teamMembers[t] === 1 ? "member" : "members"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-lg font-black tabular-nums"
                          style={{ color: team.color, fontFamily: "monospace" }}
                        >
                          {teamPR[t]}
                        </span>
                        <p
                          className="text-[10px]"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          {pct.toFixed(1)}%
                        </p>
                      </div>
                      <span
                        className="text-xs font-black"
                        style={{
                          color: rank === 0 ? "#FCD34D" : rank === 1 ? "#9CA3AF" : "#92400E",
                        }}
                      >
                        #{rank + 1}
                      </span>
                    </div>

                    {/* Strength bar */}
                    <div
                      className="h-1 rounded-full overflow-hidden mb-2"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${strengthPct}%`, background: team.color }}
                      />
                    </div>

                    {canJoinOrSwitch && (
                      <button
                        onClick={() => handleJoinTeam(t)}
                        className="w-full py-1.5 rounded-lg text-xs font-bold transition-all mt-1"
                        style={{
                          background: `${team.color}20`,
                          border: `1px solid ${team.color}40`,
                          color: team.color,
                        }}
                      >
                        {stats.team ? `Switch to ${team.label}` : `Join ${team.label}`}
                      </button>
                    )}
                    {isMyTeam && (
                      <button
                        onClick={handleLeaveTeam}
                        className="w-full py-1.5 rounded-lg text-xs font-bold transition-all mt-1"
                        style={{
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.35)",
                          color: "#EF4444",
                        }}
                      >
                        Leave Team
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {teamActionError && (
              <p className="text-xs font-semibold mt-3" style={{ color: "#F87171" }}>
                {teamActionError}
              </p>
            )}
          </div>

          {/* Battle Controls */}
          {identity && stats.team && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2
                className="text-xs font-black uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}
              >
                BATTLE CONTROLS
              </h2>
              <button
                onClick={handleCreate}
                className="w-full py-3 rounded-xl font-black text-white text-sm transition-all mb-3"
                style={{
                  background: `linear-gradient(135deg, ${userTeamColor}, ${userTeamColor}cc)`,
                  boxShadow: `0 0 20px ${userTeamColor}40`,
                }}
              >
                ⚔️ Launch Battle
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                  OR
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  className="flex-1 px-3 py-2 rounded-lg font-mono font-bold text-sm tracking-widest text-center focus:outline-none uppercase transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                />
                <button
                  onClick={handleJoin}
                  disabled={joinCode.length < 6}
                  className="px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-30"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                  }}
                >
                  Join Room
                </button>
              </div>
            </div>
          )}

          {/* My Team Members */}
          {identity && stats.team && myTeamMembers.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}
                >
                  MY TEAM
                </h2>
                {myTeamMembers.length > 5 && (
                  <button
                    onClick={() => setShowAllMembers((v) => !v)}
                    className="text-[10px] font-bold transition-all"
                    style={{ color: userTeamColor }}
                  >
                    {showAllMembers ? "Show Less" : `View All (${myTeamMembers.length})`}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {displayedMembers.map((m) => (
                  <div
                    key={`${m.handle}-${m.platform}`}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    {m.photo ? (
                      <Image
                        src={m.photo}
                        alt={m.handle}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                        style={{ background: userTeamColor }}
                      >
                        {m.handle[0]?.toUpperCase()}
                      </div>
                    )}
                    <span
                      className="text-xs font-semibold flex-1 truncate"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    >
                      @{m.handle}
                      {identity.handle === m.handle && (
                        <span
                          className="ml-1 text-[9px] font-black"
                          style={{ color: userTeamColor }}
                        >
                          (you)
                        </span>
                      )}
                    </span>
                    <span
                      className="text-xs font-black tabular-nums"
                      style={{ color: userTeamColor, fontFamily: "monospace" }}
                    >
                      +{Math.max(0, m.pr)} PR
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Live Battles */}
          {liveBattles.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <h2
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}
                >
                  LIVE BATTLES
                </h2>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: "#10B98120", color: "#10B981", border: "1px solid #10B98140" }}
                >
                  {liveBattles.filter((b) => b.status === "active").length} LIVE
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {liveBattles.slice(0, 6).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => router.push(`/watch/${b.id}`)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all w-full"
                    style={{
                      background: b.status === "active" ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${b.status === "active" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: b.status === "active" ? "#10B981" : "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        @{b.player1_handle}
                        {b.player2_handle ? ` vs @${b.player2_handle}` : " — waiting…"}
                      </p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {b.status === "active" ? `${b.player1_moves + b.player2_moves} total moves` : "Looking for opponent"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: b.status === "active" ? "#10B981" : "rgba(255,255,255,0.3)" }}>
                      {b.status === "active" ? "Watch →" : "Join →"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div
          className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: "#050714" }}
        >
          {/* Scanline effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(transparent 50%, rgba(0,0,0,0.03) 50%)",
              backgroundSize: "100% 4px",
              zIndex: 1,
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-6 p-8 w-full max-w-xl">
            {/* Title */}
            <div className="text-center">
              <h1
                className="text-4xl font-black tracking-wider mb-1"
                style={{
                  fontFamily: "monospace",
                  background: "linear-gradient(135deg, #EF4444, #3B82F6, #10B981)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                QR-WAR
              </h1>
              <p
                className="text-xs font-semibold tracking-wide"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                The team with the most battles wins dominates the code
              </p>
            </div>

            {/* QR Display */}
            <div
              className="w-full aspect-square rounded-2xl overflow-hidden qr-breathe"
              style={{
                maxWidth: "420px",
                boxShadow: "0 0 60px rgba(99,102,241,0.15), 0 0 120px rgba(99,102,241,0.05)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <QRWarDisplay
                redPR={teamPR.red}
                bluePR={teamPR.blue}
                greenPR={teamPR.green}
              />
            </div>

            {/* Legend */}
            <div className="flex gap-3 w-full justify-center flex-wrap">
              {(["red", "blue", "green"] as Team[]).map((t) => {
                const team = TEAMS[t];
                const pct = totalPR > 0 ? ((teamPR[t] / totalPR) * 100).toFixed(1) : "33.3";
                return (
                  <div
                    key={t}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{
                      background: `${team.color}12`,
                      border: `1px solid ${team.color}30`,
                    }}
                  >
                    <span className="text-base">{TEAM_EMOJIS[t]}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: team.color }}>
                        {team.label}
                      </p>
                      <p
                        className="text-[10px] font-black tabular-nums"
                        style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}
                      >
                        {teamPR[t]} PR · {pct}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
