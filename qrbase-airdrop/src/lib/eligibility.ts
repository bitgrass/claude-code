import type { EligibilityRule, EligibilityCheck } from "@/types";
import { getGameStatus, getScanModeProgress, getScanModeTokenBalance } from "./qrbase-api";

// EVM addresses are 0x + 40 hex chars. Anything else (base58) is a Solana mint.
function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function evaluateEligibility(
  rules: EligibilityRule[],
  userHandle: string,
  walletAddress: string,
  platform: "twitter" | "farcaster" = "twitter",
  solanaWallet: string = ""
): Promise<{ eligible: boolean; checks: EligibilityCheck[] }> {
  const checks: EligibilityCheck[] = [];
  let allPassed = true;

  // ── Where each value comes from ───────────────────────────────────────────
  //   partner wins + level → game/public/status (tokenWins[token], level)
  //   token balance        → game/scanMode/tokenBalance (EVM and Solana alike)
  //   tasks + thresholds   → game/scanMode/progress (minPartnerPuzzles, minLevel,
  //                          minTokenHold, tokenPriceUsd, campaignTasks)
  // progress is keyed by partnerName + the token contractAddress (to
  // disambiguate campaigns sharing a partnerName). Fetch it once.
  const tokenBalanceRule = rules.find((r) => r.type === "token_balance");
  const partnerTokenAddress = tokenBalanceRule?.tokenAddress || "";
  const partnerName =
    tokenBalanceRule?.token ||
    rules.find((r) => r.type === "puzzle_wins")?.token ||
    rules.find((r) => r.type === "social_task")?.taskId ||
    "";

  // The wins/level/task fields are userId-based; the wallet only affects qrbase's
  // own hold gate (which we don't use — we check the hold ourselves below).
  const progressWallet = walletAddress || solanaWallet || "";
  const progress = partnerName
    ? await getScanModeProgress(partnerName, userHandle, progressWallet, platform, partnerTokenAddress)
    : null;

  const needsGameStatus = rules.some(
    (r) =>
      r.type === "puzzle_wins" ||
      r.type === "min_level" ||
      r.type === "min_wins" ||
      r.type === "min_winrate"
  );
  const gameStatus = needsGameStatus ? await getGameStatus(userHandle, platform) : null;

  for (const rule of rules) {
    if (rule.type === "puzzle_wins") {
      const token = rule.token || partnerName || "SCAN";
      // scanMode/progress counts scan-mode wins for this partner; status's
      // tokenWins folds in puzzle wins too, so it over-counts. progress wins.
      const wins = progress?.userPartnerWins ?? gameStatus?.tokenWins?.[token] ?? 0;
      const required = progress?.minPartnerPuzzles ?? rule.min;
      const passed = wins >= required;
      if (!passed) allPassed = false;
      checks.push({ rule: `$${token} Puzzle Wins`, passed, current: wins, required });
    } else if (rule.type === "min_level") {
      const level = gameStatus?.level ?? 0;
      const required = progress?.minLevel ?? rule.min;
      const passed = level >= required;
      if (!passed) allPassed = false;
      checks.push({ rule: "QRbase Level", passed, current: level, required });
    } else if (rule.type === "min_wins") {
      const wins = gameStatus?.winsAllTime ?? 0;
      const passed = wins >= rule.min;
      if (!passed) allPassed = false;
      checks.push({ rule: "Total Wins", passed, current: wins, required: rule.min });
    } else if (rule.type === "min_winrate") {
      const rate = Math.round((gameStatus?.winRate ?? 0) * 100);
      const passed = rate >= rule.min;
      if (!passed) allPassed = false;
      checks.push({ rule: "Win Rate", passed, current: `${rate}%`, required: `${rule.min}%` });
    } else if (rule.type === "token_balance") {
      // Hold checked via qrbase's tokenBalance (matches qrbase). qrbase detects
      // the chain from the CA (0x… → EVM, base58 → Solana); use the wallet for
      // that chain. Price + threshold come from the shared progress response.
      const tokenAddress = rule.tokenAddress || process.env.NEXT_PUBLIC_SCAN_TOKEN_ADDRESS || "";
      const isEvm = isEvmAddress(tokenAddress);
      const wallet = isEvm ? walletAddress : solanaWallet;
      const usdMode = Boolean(rule.minUsd && rule.minUsd > 0);

      if (!tokenAddress || !wallet) {
        allPassed = false;
        checks.push({
          rule: `$${rule.token} Balance`,
          passed: false,
          current: usdMode ? "$0.00" : 0,
          required: usdMode ? `$${progress?.minTokenHold ?? rule.minUsd}` : rule.min,
        });
        continue;
      }

      // qrbase needs the token's chain (from progress.tokenChain) — e.g. BURGERS
      // lives on "robinhood", not base. Omitting it returns a silent 0.
      const balanceTokens = await getScanModeTokenBalance(wallet, tokenAddress, progress?.tokenChain);

      if (usdMode) {
        const priceUsd = progress?.tokenPriceUsd ?? 0;
        // Follow qrbase's live minTokenHold; fall back to the DB minUsd.
        const effectiveMinUsd = progress?.minTokenHold ?? rule.minUsd ?? 1;
        const balanceUsd = balanceTokens * priceUsd;
        const passed = balanceUsd >= effectiveMinUsd;
        if (!passed) allPassed = false;
        checks.push({
          rule: `$${rule.token} Balance`,
          passed,
          current: `$${balanceUsd.toFixed(2)}`,
          required: `$${effectiveMinUsd}`,
        });
      } else {
        const passed = balanceTokens >= rule.min;
        if (!passed) allPassed = false;
        checks.push({
          rule: `$${rule.token} Balance`,
          passed,
          current: Math.floor(balanceTokens),
          required: rule.min,
        });
      }
    } else if (rule.type === "social_task") {
      const label = rule.label || rule.taskId || "Social Task";
      const tasks = progress?.campaignTasks ?? [];
      const completedCount = tasks.filter((t) => t.completedByUser).length;
      const totalCount = tasks.length;
      // Passed when a required task is completed. No tasks listed → nothing to
      // do (passed) as long as progress resolved; progress failure → fail closed.
      const passed = totalCount === 0 ? Boolean(progress) : completedCount > 0;
      if (!passed) allPassed = false;
      checks.push({
        rule: label,
        passed,
        current: totalCount ? `${completedCount}/${totalCount} tasks` : "—",
        required: totalCount ? `${totalCount}/${totalCount} tasks` : "—",
        actionUrl: rule.url,
        actionLabel: rule.url ? "Go →" : undefined,
      });
    }
  }

  return { eligible: allPassed, checks };
}
