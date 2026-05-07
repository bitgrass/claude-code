"use client";

import type { EligibilityCheck } from "@/types";

export function EligibilityChecks({ checks }: { checks: EligibilityCheck[] }) {
  if (!checks?.length) return null;
  return (
    <div className="space-y-2">
      {checks.map((check, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-xl border ${
            check.passed
              ? "bg-green-50 border-green-100"
              : "bg-red-50 border-red-100"
          }`}
        >
          <span className="text-base mt-0.5 flex-shrink-0">{check.passed ? "\u2705" : "\u274C"}</span>
          <div className="min-w-0">
            <p className={`font-semibold text-sm ${check.passed ? "text-green-800" : "text-red-800"}`}>
              {check.rule}
            </p>
            <p className={`text-xs font-mono mt-0.5 ${check.passed ? "text-green-600" : "text-red-600"}`}>
              {check.passed
                ? `${check.current} / ${check.required} \u2713`
                : `${check.current} / ${check.required} needed`}
            </p>
            {check.actionUrl && (
              <a
                href={check.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
              >
                {check.actionLabel || "Go \u2192"}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
