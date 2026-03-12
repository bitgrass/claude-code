import type { AntiBot, EligibilityResult, TwitterUser } from "@/types";

export function checkEligibility(user: TwitterUser, rules: AntiBot): EligibilityResult {
  const accountAge = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (accountAge < rules.minAccountAgeDays) {
    return {
      eligible: false,
      reason: `Account must be at least ${rules.minAccountAgeDays} days old (yours is ${accountAge} days)`,
      failedRule: "minAccountAgeDays",
    };
  }

  if (user.public_metrics.followers_count < rules.minFollowers) {
    return {
      eligible: false,
      reason: `Must have at least ${rules.minFollowers} followers (you have ${user.public_metrics.followers_count})`,
      failedRule: "minFollowers",
    };
  }

  if (user.public_metrics.following_count < rules.minFollowing) {
    return {
      eligible: false,
      reason: `Must be following at least ${rules.minFollowing} accounts (you follow ${user.public_metrics.following_count})`,
      failedRule: "minFollowing",
    };
  }

  if (rules.requireVerified && !user.verified) {
    return {
      eligible: false,
      reason: "Must be a verified account",
      failedRule: "requireVerified",
    };
  }

  return { eligible: true };
}
