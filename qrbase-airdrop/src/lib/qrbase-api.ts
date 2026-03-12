const QRBASE_API_URL = process.env.QRBASE_API_URL || "https://api.qrbase.xyz";
const QRBASE_API_SECRET = process.env.QRBASE_API_SECRET || "";

export async function getPuzzleWins(
  twitterId: string,
  token: string
): Promise<number> {
  const url = `${QRBASE_API_URL}/users/${twitterId}/contributions?token=${token}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${QRBASE_API_SECRET}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    console.error(
      `QRbase API error: ${response.status} for twitterId=${twitterId}`
    );
    return 0;
  }

  const data = await response.json();
  return data.wins ?? data.count ?? 0;
}
