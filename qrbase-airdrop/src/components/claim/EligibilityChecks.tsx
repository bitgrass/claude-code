"use client";

import type { EligibilityCheck } from "@/types";

export function EligibilityChecks({ checks }: { checks: EligibilityCheck[] }) {
  if (!checks?.length) return null;
  return (
    <div className="space-y-3">
      {checks.map((check, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-xl ${
            check.passed ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <span className="text-lg mt-0.5">{check.passed ? "\u2705" : "\u274C"}</span>
          <div>
            <p
              className={`font-medium ${
                check.passed ? "text-green-800" : "text-red-800"
              }`}
            >
              {check.rule}
            </p>
            <p
              className={`text-sm ${
                check.passed ? "text-green-600" : "text-red-600"
              }`}
            >
              {check.passed
                ? `You have ${check.current} (need ${check.required})`
                : `You have ${check.current}, need ${check.required}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
