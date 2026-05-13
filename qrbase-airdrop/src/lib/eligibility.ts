import type { EligibilityRule, EligibilityCheck } from "@/types";
import { getGameStatus, getScanModeProgress } from "./qrbase-api";

async function verifySocialTask(
  rule: EligibilityRule,
  userHandle: string,
  walletAddress: string,
  platform: "twitter" | "farcaster"
): Promise<EligibilityCheck> {
  const label = rule.label || rule.taskId || "Social Task";

  if (!rule.taskId) {
    return { rule: label, passed: false, current: 0, required: 1, actionUrl: rule.url, actionLabel: rule.url ? "Go \u2192" : undefined };
  }

  try {
    // Use scanMode/progress endpoint \u2014 taskId is the partnerName (e.g. "RUSSELL")
    const progress = await getScanModeProgress(rule.taskId, userHandle, walletAddress, platform);

    if (!progress) {
      return { rule: label, passed: false, current: 0, required: 1, actionUrl: rule.url, actionLabel: rule.url ? "Go \u2192" : undefined };
    }

    const passed = progress.taskGatePassed;
    const completedCount = progress.campaignTasks.filter((t) => t.completedByUser).length;
    const totalCount = progress.campaignTasks.length;

    return {
      rule: label,
      passed,
      current: `${completedCount}/${totalCount} tasks`,
      required: `${totalCount}/${totalCount} tasks`,
      actionUrl: rule.url,
      actionLabel: rule.url ? "Go \u2192" : undefined,
    };
  } catch (err) {
    console.error("verifySocialTask error:", err);
    return { rule: label, passed: false, current: 0, required: 1, actionUrl: rule.url, actionLabel: rule.url ? "Go \u2192" : undefined };
  }
}

export async function evaluateEligibility(
  rules: EligibilityRule[],
  userHandle: string,
  walletAddress: string,
  platform: "twitter" | "farcaster" = "twitter"
): Promise<{ eligible: boolean; checks: EligibilityCheck[] }> {
  const checks: EligibilityCheck[] = [];
  let allPassed = true;

  // Fetch game status once if any rule needs it
  const needsGameStatus = rules.some(
    (r) => r.type === "puzzle_wins" || r.type === "min_level" || r.type === "min_wins" || r.type === "min_winrate"
  );
  const gameStatus = needsGameStatus ? await getGameStatus(userHandle, platform) : null;

  for (const rule of rules) {
    if (rule.type === "puzzle_wins") {
      const wins = gameStatus?.tokenWins?.[rule.token ?? ""] ?? 0;
      const passed = wins >= rule.min;
      if (!passed) allPassed = false;
      checks.push({
        rule: `$${rule.token} Puzzle Wins`,
        passed,
        current: wins,
        required: rule.min,
      });
    } else if (rule.type === "min_level") {
      const level = gameStatus?.level ?? 0;
      const passed = level >= rule.min;
      if (!passed) allPassed = false;
      checks.push({
        rule: "QRbase Level",
        passed,
        current: level,
        required: rule.min,
      });
    } else if (rule.type === "min_wins") {
      const wins = gameStatus?.winsAllTime ?? 0;
      const passed = wins >= rule.min;
      if (!passed) allPassed = false;
      checks.push({
        rule: "Total Wins",
        passed,
        current: wins,
        required: rule.min,
      });
    } else if (rule.type === "min_winrate") {
      const rate = Math.round((gameStatus?.winRate ?? 0) * 100);
      const passed = rate >= rule.min;
      if (!passed) allPassed = false;
      checks.push({
        rule: "Win Rate",
        passed,
        current: `${rate}%`,
        required: `${rule.min}%`,
      });
    } else if (rule.type === "token_balance") {
      if (!walletAddress) {
        // Skip balance check until wallet is connected — re-check will verify it
        continue;
      }
      const tokenAddress = rule.tokenAddress || process.env.NEXT_PUBLIC_SCAN_TOKEN_ADDRESS || "";
      const moralisKey = process.env.NEXT_PUBLIC_MORALIS_APY_KEY || "";

      const moralisRes = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${walletAddress}/erc20?chain=base&token_addresses%5B0%5D=${tokenAddress}`,
        { headers: { accept: "application/json", "X-API-Key": moralisKey } }
      );
      const moralisData = await moralisRes.json() as { balance?: string; decimals?: string }[];
      const tokenData = moralisData?.[0];
      const balanceInTokens = tokenData
        ? Number(tokenData.balance ?? "0") / 10 ** Number(tokenData.decimals ?? "18")
        : 0;

      if (rule.minUsd && rule.minUsd > 0) {
        const priceRes = await fetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/price?chain=base`,
          { headers: { accept: "application/json", "X-API-Key": moralisKey } }
        );
        const priceData = await priceRes.json() as { usdPrice?: number };
        const tokenPriceUsd = priceData?.usdPrice ?? 0;
        const balanceUsd = balanceInTokens * tokenPriceUsd;
        const passed = balanceUsd >= rule.minUsd;
        if (!passed) allPassed = false;
        checks.push({
          rule: `$${rule.token} Balance`,
          passed,
          current: `$${balanceUsd.toFixed(2)}`,
          required: `$${rule.minUsd}`,
        });
      } else {
        const passed = balanceInTokens >= rule.min;
        if (!passed) allPassed = false;
        checks.push({
          rule: `$${rule.token} Balance`,
          passed,
          current: Math.floor(balanceInTokens),
          required: rule.min,
        });
      }
    } else if (rule.type === "social_task") {
      const check = await verifySocialTask(rule, userHandle, walletAddress, platform);
      if (!check.passed) allPassed = false;
      checks.push(check);
    }
  }

  return { eligible: allPassed, checks };
}
