import type { EligibilityRule, EligibilityCheck } from "@/types";
import { getTokenBalance } from "./alchemy";
import { getPuzzleWins } from "./qrbase-api";

export async function evaluateEligibility(
  rules: EligibilityRule[],
  twitterId: string,
  walletAddress: string
): Promise<{ eligible: boolean; checks: EligibilityCheck[] }> {
  const checks: EligibilityCheck[] = [];
  let allPassed = true;

  for (const rule of rules) {
    if (rule.type === "puzzle_wins") {
      const wins = await getPuzzleWins(twitterId, rule.token);
      const passed = wins >= rule.min;
      if (!passed) allPassed = false;

      checks.push({
        rule: `$${rule.token} Puzzle Wins`,
        passed,
        current: wins,
        required: rule.min,
      });
    } else if (rule.type === "token_balance") {
      const tokenAddress =
        process.env.NEXT_PUBLIC_SCAN_TOKEN_ADDRESS || "";

      const { balance, decimals } = await getTokenBalance(
        tokenAddress,
        walletAddress
      );

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
