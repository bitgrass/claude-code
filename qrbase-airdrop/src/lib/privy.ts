import { PrivyClient } from "@privy-io/server-auth";

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function verifyPrivyToken(authHeader: string | null): Promise<{
  userId: string;
  twitterId: string | null;
  twitterHandle: string | null;
  walletAddress: string | null;
} | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    const verifiedClaims = await privyClient.verifyAuthToken(token);
    const user = await privyClient.getUser(verifiedClaims.userId);

    let twitterId: string | null = null;
    let twitterHandle: string | null = null;
    let walletAddress: string | null = null;

    for (const account of user.linkedAccounts) {
      if (account.type === "twitter_oauth") {
        twitterId = account.subject;
        twitterHandle = account.username ?? null;
      }
      if (account.type === "wallet") {
        walletAddress = account.address;
      }
    }

    return {
      userId: verifiedClaims.userId,
      twitterId,
      twitterHandle,
      walletAddress,
    };
  } catch {
    return null;
  }
}
