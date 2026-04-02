"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { getActiveTasks } from "@/lib/qrbase-api";
import { useAuth } from "@/contexts/AuthContext";
import type { ActiveTask } from "@/types";

const PLATFORM_STYLE = {
  x:        { bg: "bg-gray-900 text-white",       label: "𝕏 Twitter"   },
  farcaster: { bg: "bg-accent-purple text-white", label: "🟣 Farcaster" },
};

const TYPE_ICON: Record<string, string> = {
  x_follow:          "👤",
  x_post_engage:     "💬",
  fc_follow:         "👤",
  fc_cast_engage:    "💬",
  fc_miniapp_engage: "📱",
};

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h left`;
  return `${h}h left`;
}

// States a single task card can be in for the current user session
type CardState = "idle" | "opened" | "verifying" | "done" | "error";

function TaskCard({
  task,
  userId,
  onCompleted,
}: {
  task: ActiveTask;
  userId: string | null;
  onCompleted: (taskId: string) => void;
}) {
  const [cardState, setCardState] = useState<CardState>(
    task.completedByUser ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const prevCompleted = useRef(task.completedByUser);
  useEffect(() => {
    if (task.completedByUser && prevCompleted.current !== task.completedByUser) {
      setCardState("done");
    }
    prevCompleted.current = task.completedByUser;
  }, [task.completedByUser]);

  const pct = task.maxCompletions > 0
    ? Math.round((task.completionsCount / task.maxCompletions) * 100)
    : 0;
  const spotsLeft = task.maxCompletions - task.completionsCount;
  const plat  = PLATFORM_STYLE[task.platform];
  const icon  = TYPE_ICON[task.taskType] ?? "✅";
  const actions = task.actionsBundled.split(",").map((a) => a.trim());
  const isFull = spotsLeft <= 0;

  // Step 1: open the target link and transition to "opened" state
  const handleOpen = useCallback(() => {
    window.open(task.targetLink, "_blank", "noopener,noreferrer");
    setCardState("opened");
  }, [task.targetLink]);

  // Step 2: verify with the worker that the social action was done
  const handleVerify = useCallback(async () => {
    if (!userId) return;
    setCardState("verifying");
    setErrorMsg(null);
    try {
      const isMiniapp = task.taskType === "fc_miniapp_engage";
      const res = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          userId,
          miniappAdded: isMiniapp ? true : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCardState("done");
        onCompleted(task.id);
      } else {
        setErrorMsg(data.error || "Verification failed. Complete the action first.");
        setCardState("opened"); // let them retry
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setCardState("opened");
    }
  }, [userId, task.id, task.taskType, onCompleted]);

  return (
    <div className={`rounded-2xl border-2 bg-white p-5 flex flex-col gap-3 transition-all ${
      cardState === "done"
        ? "border-green-300 bg-green-50/40"
        : "border-border hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm"
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-xl ${plat.bg} flex items-center justify-center text-lg flex-shrink-0`}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-gray-900 text-sm leading-tight">{task.label}</p>
            <span className={`inline-block mt-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${plat.bg}`}>
              {plat.label}
            </span>
          </div>
        </div>
        {cardState === "done" ? (
          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
            ✅ Completed
          </span>
        ) : (
          <span className={`text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap ${
            isFull ? "bg-gray-100 text-gray-400" :
            spotsLeft <= 5 ? "bg-primary/10 text-primary" : "bg-surface-muted text-muted"
          }`}>
            {isFull ? "Full" : `${spotsLeft} spots left`}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <span key={a} className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface-muted text-gray-700 border border-border">
            {a}
          </span>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] font-bold text-muted mb-1">
          <span>{task.completionsCount} / {task.maxCompletions} completed</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      {cardState === "done" ? (
        <div className="w-full text-center text-xs font-black py-2 rounded-xl bg-green-100 text-green-700">
          ✅ Task completed — +{task.price} $SCAN earned
        </div>
      ) : !userId ? (
        <div className="w-full text-center text-xs font-bold py-2 rounded-xl bg-surface-muted text-muted">
          Connect to complete this task
        </div>
      ) : isFull ? (
        <div className="w-full text-center text-xs font-bold py-2 rounded-xl bg-surface-muted text-muted">
          No spots remaining
        </div>
      ) : cardState === "idle" ? (
        <button
          onClick={handleOpen}
          className="block w-full text-center text-xs font-black py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors"
        >
          Complete Task →
        </button>
      ) : cardState === "opened" ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleVerify}
            className="w-full text-center text-xs font-black py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Verify Completion ✓
          </button>
          <button
            onClick={handleOpen}
            className="w-full text-center text-xs font-bold py-1.5 rounded-xl border border-border text-muted hover:text-gray-700 transition-colors"
          >
            Re-open task link ↗
          </button>
          {errorMsg && (
            <p className="text-[11px] text-red-500 font-semibold text-center">{errorMsg}</p>
          )}
        </div>
      ) : cardState === "verifying" ? (
        <div className="w-full text-center text-xs font-black py-2 rounded-xl bg-primary/10 text-primary animate-pulse">
          Verifying…
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-2">
          {task.promoterPhoto ? (
            <Image src={task.promoterPhoto} alt={task.promoterName ?? ""} width={20} height={20} className="rounded-full ring-1 ring-border" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-surface-muted border border-border" />
          )}
          <span className="text-xs text-muted font-semibold truncate max-w-[120px]">
            {task.promoterName ?? "Anonymous"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            +{task.price} $SCAN
          </span>
          <span className="text-[10px] font-bold text-muted">{timeLeft(task.expiresAt)}</span>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-40 rounded-2xl bg-surface-muted animate-pulse" />
      ))}
    </div>
  );
}

function EmptyTasks() {
  return (
    <div className="text-center py-12 rounded-2xl border-2 border-dashed border-border bg-white">
      <span className="text-4xl">🎯</span>
      <p className="font-extrabold text-gray-900 mt-3">No active tasks right now</p>
      <p className="text-sm text-muted mt-1">New tasks drop regularly — check back soon fren 🤖</p>
    </div>
  );
}

export function TasksSection() {
  const { identity } = useAuth();
  const [tasks, setTasks]     = useState<ActiveTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Build the userId string the worker expects (e.g. "x:handle" or "fc:handle")
  const userId = identity
    ? `${identity.platform === "farcaster" ? "fc" : "x"}:${identity.handle}`
    : null;

  useEffect(() => {
    setLoading(true);
    getActiveTasks(userId ?? undefined).then((t) => {
      setTasks(t);
      setLoading(false);
    });
  }, [userId]);

  // When a task is completed locally, bump its completedByUser flag so the
  // card flips to "done" even before the next fetch.
  const handleCompleted = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completedByUser: true, completionsCount: t.completionsCount + 1 }
          : t
      )
    );
  }, []);

  const completedCount = tasks.filter((t) => t.completedByUser).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">Active Quests</p>
          <h2 className="text-3xl font-extrabold text-gray-900">Tasks & Boosts</h2>
          <p className="text-sm text-muted mt-1">
            Complete social tasks to earn $SCAN.{" "}
            <span className="font-bold text-gray-700">ngmi if you skip.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && tasks.length > 0 && (
            <span className="text-xs font-black px-3 py-1.5 rounded-full bg-primary text-white">
              {tasks.length} live tasks
            </span>
          )}
          {!loading && userId && completedCount > 0 && (
            <span className="text-xs font-black px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              ✅ {completedCount} completed
            </span>
          )}
          <span className="text-xs font-black px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
            🚀 Updates live
          </span>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : tasks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userId={userId}
              onCompleted={handleCompleted}
            />
          ))}
        </div>
      ) : (
        <EmptyTasks />
      )}
    </div>
  );
}
