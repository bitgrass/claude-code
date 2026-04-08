"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBattleStats } from "@/hooks/useBattleStats";
import { TEAMS, type Team } from "@/types/battle";

type ChatChannel = "global" | "team";

type ChatMessage = {
  id: number;
  channel: ChatChannel;
  team: Team | null;
  user_team: Team | null;
  handle: string;
  platform: "twitter" | "farcaster";
  display_name: string | null;
  photo: string | null;
  message: string;
  created_at: string;
};

const POLL_MS = 1000;
const TEAM_ICON: Record<Team, string> = {
  red: "🔴",
  blue: "🔵",
  green: "🟢",
};

function formatClock(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function upsertMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return existing;
  const byId = new Map<number, ChatMessage>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

export function WarChatDock() {
  const { identity } = useAuth();
  const { stats } = useBattleStats(identity?.handle ?? null, identity?.platform ?? "twitter");
  const team = stats.team;

  const [minimized, setMinimized] = useState(false);
  const [channel, setChannel] = useState<ChatChannel>("global");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<number>(0);

  const canUseTeamChannel = !!team;
  const activeTeam = channel === "team" ? team : null;

  const channelLabel = useMemo(() => {
    if (channel === "global") return "Global";
    if (!team) return "Team";
    return `${team[0].toUpperCase()}${team.slice(1)} Team`;
  }, [channel, team]);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  const loadMessages = useCallback(
    async (incremental: boolean) => {
      if (channel === "team" && !team) {
        setMessages([]);
        lastIdRef.current = 0;
        return;
      }

      if (!incremental) {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          channel,
          limit: "80",
        });
        if (channel === "team" && team) {
          params.set("team", team);
        }
        if (incremental && lastIdRef.current > 0) {
          params.set("sinceId", String(lastIdRef.current));
        }

        const res = await fetch(`/api/chat?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load chat");
        }
        const data = (await res.json()) as { messages?: ChatMessage[] };
        const incoming = Array.isArray(data.messages) ? data.messages : [];

        setMessages((prev) => {
          const next = incremental ? upsertMessages(prev, incoming) : incoming;
          const maxId = next.length > 0 ? next[next.length - 1].id : 0;
          lastIdRef.current = maxId;
          return next;
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load chat";
        setError(message);
      } finally {
        if (!incremental) setLoading(false);
      }
    },
    [channel, team]
  );

  useEffect(() => {
    lastIdRef.current = 0;
    setMessages([]);
    setError(null);
    void loadMessages(false);
  }, [loadMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadMessages(true);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    if (!identity || sending) return;
    if (channel === "team" && !team) return;

    const text = draft.trim();
    if (!text) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          team: channel === "team" ? team : null,
          handle: identity.handle,
          platform: identity.platform,
          displayName: identity.displayName,
          photo: identity.profilePhoto,
          message: text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to send message");

      if (data.message) {
        const row = data.message as ChatMessage;
        setMessages((prev) => {
          const next = upsertMessages(prev, [row]);
          const maxId = next.length > 0 ? next[next.length - 1].id : 0;
          lastIdRef.current = maxId;
          return next;
        });
      }
      setDraft("");
      scrollToBottom();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send message";
      setError(message);
    } finally {
      setSending(false);
    }
  }, [identity, sending, channel, team, draft, scrollToBottom]);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl text-sm font-bold text-white"
        style={{
          background: "rgba(8,12,26,0.92)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}
      >
        Live Chat
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-[340px] h-[430px] rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(8,12,26,0.96)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white">Live Chat</span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            {channelLabel}
          </span>
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="text-xs px-2 py-0.5 rounded"
          style={{ color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Minimize
        </button>
      </div>

      <div className="px-2 pt-2 flex gap-2">
        <button
          onClick={() => setChannel("global")}
          className="flex-1 text-xs font-bold py-1.5 rounded-lg"
          style={{
            background: channel === "global" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${channel === "global" ? "rgba(59,130,246,0.45)" : "rgba(255,255,255,0.08)"}`,
            color: channel === "global" ? "#93C5FD" : "rgba(255,255,255,0.7)",
          }}
        >
          Global
        </button>
        <button
          onClick={() => setChannel("team")}
          className="flex-1 text-xs font-bold py-1.5 rounded-lg"
          disabled={!canUseTeamChannel}
          style={{
            background: channel === "team" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${channel === "team" ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)"}`,
            color: channel === "team" ? "#6EE7B7" : "rgba(255,255,255,0.7)",
            opacity: canUseTeamChannel ? 1 : 0.5,
            cursor: canUseTeamChannel ? "pointer" : "not-allowed",
          }}
          title={canUseTeamChannel ? "" : "Join a team to unlock team chat"}
        >
          Team
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {loading ? (
          <p className="text-xs text-center pt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            Loading chat...
          </p>
        ) : channel === "team" && !activeTeam ? (
          <p className="text-xs text-center pt-3" style={{ color: "rgba(255,255,255,0.55)" }}>
            Join a team first to open team chat.
          </p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-center pt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            No messages yet.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className="rounded-lg px-2 py-1.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.handle}
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ border: "1px solid rgba(255,255,255,0.18)" }}
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black text-white"
                      style={{ background: "rgba(255,255,255,0.25)" }}
                    >
                      {m.handle[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-white truncate">
                    @{m.handle}
                  </span>
                  {m.user_team && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: `${TEAMS[m.user_team].color}22`,
                        border: `1px solid ${TEAMS[m.user_team].color}55`,
                        color: TEAMS[m.user_team].color,
                      }}
                      title={`${m.user_team} team`}
                    >
                      {TEAM_ICON[m.user_team]} {m.user_team}
                    </span>
                  )}
                </div>
                <span className="text-[10px] shrink-0" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {formatClock(m.created_at)}
                </span>
              </div>
              <p className="text-xs leading-snug break-words" style={{ color: "rgba(255,255,255,0.9)" }}>
                {m.message}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="p-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {error && (
          <p className="text-[11px] mb-1" style={{ color: "#FCA5A5" }}>
            {error}
          </p>
        )}
        {!identity ? (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            Sign in to send messages.
          </p>
        ) : channel === "team" && !activeTeam ? (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            Join a team to send team messages.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={channel === "global" ? "Message all war users..." : "Message your team..."}
              className="flex-1 px-2.5 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
              }}
              maxLength={280}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={sending || draft.trim().length === 0}
              className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-45"
              style={{
                background: channel === "global" ? "#2563EB" : "#059669",
              }}
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
