export async function verifyPrivyToken(authHeader: string | null): Promise<{
  userId: string;
  twitterId: string | null;
  twitterHandle: string | null;
  walletAddress: string | null;
} | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const appSecret = process.env.PRIVY_APP_SECRET!;

  try {
    // Decode JWT payload to get userId (no signature verification)
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1])) as { sub?: string };
    const userId = payload.sub;
    if (!userId) return null;

    // Confirm user exists in Privy via server-to-server API call
    const res = await fetch(`https://auth.privy.io/api/v1/users/${userId}`, {
      headers: {
        Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`,
        "privy-app-id": appId,
      },
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      linked_accounts: Array<{
        type: string;
        subject?: string;
        username?: string;
        address?: string;
      }>;
    };

    let twitterId: string | null = null;
    let twitterHandle: string | null = null;
    let walletAddress: string | null = null;

    for (const account of data.linked_accounts) {
      if (account.type === "twitter_oauth") {
        twitterId = account.subject ?? null;
        twitterHandle = account.username ?? null;
      }
      if (account.type === "wallet") {
        walletAddress = account.address ?? null;
      }
    }

    return { userId, twitterId, twitterHandle, walletAddress };
  } catch (err) {
    console.error("verifyPrivyToken error:", err);
    return null;
  }
}
