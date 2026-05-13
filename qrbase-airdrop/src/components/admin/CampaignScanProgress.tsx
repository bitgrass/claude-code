"use client";

import { useEffect, useState } from "react";

interface ScanTask {
  id: number;
  platform: string;
  taskType: string;
  targetLink: string;
  label: string;
  completedByUser: boolean;
}

export interface ScanProgress {
  partnerName: string;
  totalPlays: number;
  milestones: number[];
  campaignStatus: string;
  taskGatePassed: boolean;
  campaignTasks: ScanTask[];
}

interface Props {
  partnerName: string;
  userHandle?: string | null;
  walletAddress?: string | null;
  platform?: "twitter" | "farcaster";
  // "full" = progress bar + task cards (admin views)
  // "progress" = progress bar only (left column claim page)
  // "task-card" = single "Task Status" card (right column eligibility section)
  variant?: "full" | "progress" | "task-card";
  // When provided, skips internal fetch — used by ClaimPage to share one request
  preloadedData?: ScanProgress | null;
}

export function CampaignScanProgress({ partnerName, userHandle, walletAddress, platform = "twitter", variant = "full", preloadedData }: Props) {
  const [fetched, setFetched] = useState<ScanProgress | null>(null);

  useEffect(() => {
    if (preloadedData !== undefined) return; // parent manages the fetch
    const prefix = platform === "farcaster" ? "fc" : "x";
    const userId = userHandle ? `${prefix}:${userHandle}` : null;

    let url = `/api/scan-progress?partnerName=${encodeURIComponent(partnerName)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    if (walletAddress) url += `&walletAddress=${encodeURIComponent(walletAddress)}`;

    fetch(url)
      .then((r) => r.json())
      .then((res) => { if (res.success) setFetched(res.data); })
      .catch(() => null);
  }, [partnerName, userHandle, walletAddress, platform, preloadedData]);

  const data = preloadedData !== undefined ? preloadedData : fetched;
  if (!data) return null;

  const finalMilestone = data.milestones[data.milestones.length - 1] ?? 100;
  const progress = Math.min((data.totalPlays / finalMilestone) * 100, 100);
  const isActive = data.campaignStatus === "ACTIVE";
  const hasUser = Boolean(userHandle);

  // Single "Task Status" card — same design as EligibilityChecks
  if (variant === "task-card") {
    if (!data.campaignTasks.length) return null;
    const passed = hasUser && data.campaignTasks.every((t) => t.completedByUser);
    const subLabel = passed ? "Completed" : "Not completed";

    return (
      <div className={`flex items-start gap-3 p-3 rounded-xl border ${passed ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
        <span className="text-base mt-0.5 flex-shrink-0">{passed ? "✅" : "❌"}</span>
        <div className="min-w-0">
          <p className={`font-semibold text-sm ${passed ? "text-green-800" : "text-red-800"}`}>Task Status</p>
          <p className={`text-xs font-mono mt-0.5 ${passed ? "text-green-600" : "text-red-600"}`}>{subLabel}</p>
        </div>
      </div>
    );
  }

  const progressBar = (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted">
          ScanMode Plays
        </span>
        <span className="text-xs font-mono font-semibold text-gray-900">
          {data.totalPlays} / {finalMilestone}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: "linear-gradient(to right, #0052FF, #AE80FF)" }}
        />
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-green-500" : "bg-red-400"}`} />
        <span className={`text-[10px] font-semibold ${isActive ? "text-green-700" : "text-red-500"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-[10px] text-muted">· {Math.round(progress)}% to final milestone</span>
      </div>
    </div>
  );

  // "progress" variant — progress bar only, no task cards
  if (variant === "progress") {
    return <div className="space-y-3 pt-3 border-t border-border">{progressBar}</div>;
  }

  // "full" variant — progress bar + task cards (admin views)
  return (
    <div className="space-y-3 pt-3 border-t border-border">
      {progressBar}
      {data.campaignTasks.length > 0 && (
        <div className="space-y-2 mt-3">
          {data.campaignTasks.map((task) => {
            const completed = hasUser ? task.completedByUser : null;
            const cardClass = completed === true
              ? "border-green-200 bg-green-50"
              : completed === false
              ? "border-red-200 bg-red-50"
              : "border-border bg-surface-muted";
            const iconClass = completed === true ? "text-green-600" : completed === false ? "text-red-500" : "text-gray-400";
            const labelClass = completed === true ? "text-green-800" : completed === false ? "text-red-700" : "text-gray-700";

            return (
              <a
                key={task.id}
                href={task.targetLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-opacity hover:opacity-80 ${cardClass}`}
              >
                <span className={`flex-shrink-0 ${iconClass}`}>
                  {completed === true ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </span>
                <span className={`flex-1 text-sm font-semibold ${labelClass}`}>{task.label}</span>
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
