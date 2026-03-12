import type { TwitterUser } from "@/types";

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

export async function getTwitterUser(userId: string): Promise<TwitterUser | null> {
  if (!TWITTER_BEARER_TOKEN) throw new Error("TWITTER_BEARER_TOKEN not configured");

  const response = await fetch(
    `https://api.twitter.com/2/users/${userId}?user.fields=created_at,public_metrics,verified,profile_image_url`,
    {
      headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
      next: { revalidate: 300 },
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.data as TwitterUser;
}

export async function getTwitterUserByUsername(username: string): Promise<TwitterUser | null> {
  if (!TWITTER_BEARER_TOKEN) throw new Error("TWITTER_BEARER_TOKEN not configured");

  const response = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}?user.fields=created_at,public_metrics,verified,profile_image_url`,
    {
      headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
      next: { revalidate: 300 },
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.data as TwitterUser;
}
