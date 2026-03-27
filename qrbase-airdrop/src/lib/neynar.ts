type FarcasterUser = {
  username: string;
  pfp: string | null;
  xUsername: string | null;
};

// Returns map of fid -> { username, pfp, xUsername }.
export async function getFarcasterUsers(
  fids: number[]
): Promise<Record<number, FarcasterUser>> {
  const uniqueFids = [...new Set(fids)].filter(
    (fid) => Number.isInteger(fid) && fid > 0 && fid < 1_000_000_000
  );
  if (uniqueFids.length === 0) return {};

  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return {};

  const map: Record<number, FarcasterUser> = {};
  // Query one FID at a time so one invalid id cannot poison the whole batch.
  for (const fid of uniqueFids) {
    try {
      const res = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        { headers: { "x-api-key": apiKey, accept: "application/json" } }
      );
      if (!res.ok) continue;

      const data = (await res.json()) as {
        users?: Array<{
          fid: number;
          username?: string;
          pfp_url?: string;
          verified_accounts?: Array<{ platform?: string; username?: string }>;
        }>;
      };

      for (const user of data.users || []) {
        if (!user.username) continue;
        const xAccount = (user.verified_accounts || []).find(
          (account) => account.platform === "x" && account.username
        );
        map[user.fid] = {
          username: user.username,
          pfp: user.pfp_url || null,
          xUsername: xAccount?.username || null,
        };
      }
    } catch {
      // Continue with the next FID.
    }
  }

  return map;
}

// Fetches Farcaster usernames for a list of FIDs -> returns fid -> username.
export async function getFarcasterUsernames(
  fids: number[]
): Promise<Record<number, string>> {
  const users = await getFarcasterUsers(fids);
  const map: Record<number, string> = {};
  for (const [fid, user] of Object.entries(users)) {
    map[Number(fid)] = user.username;
  }
  return map;
}

// Fetches the primary verified ETH address for a Farcaster user via Neynar API.
export async function getFarcasterPrimaryWallet(
  fid: number
): Promise<string | null> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      { headers: { "x-api-key": apiKey, accept: "application/json" } }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      users?: Array<{
        verified_addresses?: {
          primary?: { eth_address?: string };
          eth_addresses?: string[];
        };
        custody_address?: string;
      }>;
    };

    const user = data.users?.[0];
    if (!user) return null;

    // Prefer primary verified address, then first verified, then custody.
    return (
      user.verified_addresses?.primary?.eth_address ||
      user.verified_addresses?.eth_addresses?.[0] ||
      user.custody_address ||
      null
    );
  } catch {
    return null;
  }
}
