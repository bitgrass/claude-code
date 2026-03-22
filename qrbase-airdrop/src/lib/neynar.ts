// Fetches the primary verified ETH address for a Farcaster user via Neynar API
export async function getFarcasterPrimaryWallet(fid: number): Promise<string | null> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      { headers: { "x-api-key": apiKey, accept: "application/json" } }
    );
    if (!res.ok) return null;

    const data = await res.json() as {
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

    // Prefer primary verified address, fall back to first verified, then custody address
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
