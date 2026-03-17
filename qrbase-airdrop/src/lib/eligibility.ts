import type { EligibilityRule, EligibilityCheck } from "@/types";
import { getTokenBalance } from "./alchemy";
import { getGameStatus } from "./qrbase-api";

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
      const tokenAddress = process.env.NEXT_PUBLIC_SCAN_TOKEN_ADDRESS || "";
      const { balance, decimals } = await getTokenBalance(tokenAddress, walletAddress);
      const balanceInTokens = Number(balance) / 10 ** decimals;
      const passed = balanceInTokens >= rule.min;
      if (!passed) allPassed = false;
      checks.push({
        rule: `$${rule.token} Balance`,
        passed,
        current: Math.floor(balanceInTokens),
        required: rule.min,
      });
    }
  }

  return { eligible: allPassed, checks };
}
