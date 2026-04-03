import { sql, type Platform } from "@/lib/db";

type TimeoutBattleRow = {
  player1_handle: string;
  player1_platform: Platform | null;
  player1_name: string | null;
  player1_photo: string | null;
  player2_handle: string | null;
  player2_platform: Platform | null;
  player2_name: string | null;
  player2_photo: string | null;
};

function normalizePlatform(platform: Platform | null | undefined): Platform {
  return platform === "farcaster" ? "farcaster" : "twitter";
}

async function upsertLoss(
  handle: string,
  platform: Platform,
  displayName: string | null,
  photo: string | null
) {
  await sql`
    INSERT INTO players (handle, platform, display_name, photo, wins, losses, pr)
    VALUES (${handle}, ${platform}, ${displayName}, ${photo}, 0, 1, 0)
    ON CONFLICT (handle, platform) DO UPDATE SET
      losses       = players.losses + 1,
      pr           = GREATEST(0, players.wins - (players.losses + 1)),
      display_name = COALESCE(${displayName}, players.display_name),
      photo        = COALESCE(${photo}, players.photo),
      updated_at   = NOW()
  `;
}

async function applyTimeoutLosses(rows: TimeoutBattleRow[]) {
  for (const row of rows) {
    await upsertLoss(
      row.player1_handle,
      normalizePlatform(row.player1_platform),
      row.player1_name,
      row.player1_photo
    );

    if (row.player2_handle) {
      await upsertLoss(
        row.player2_handle,
        normalizePlatform(row.player2_platform),
        row.player2_name,
        row.player2_photo
      );
    }
  }
}

export async function finalizeTimedOutBattleById(roomId: string) {
  const rows = (await sql`
    UPDATE battles
    SET status = 'done',
        winner = 'timeout'
    WHERE id = ${roomId}
      AND status = 'active'
      AND started_at IS NOT NULL
      AND started_at <= NOW() - INTERVAL '2 minutes'
    RETURNING
      player1_handle,
      player1_platform,
      player1_name,
      player1_photo,
      player2_handle,
      player2_platform,
      player2_name,
      player2_photo
  `) as TimeoutBattleRow[];

  if (rows.length > 0) {
    await applyTimeoutLosses(rows);
  }
}

export async function finalizeAllTimedOutBattles() {
  const rows = (await sql`
    UPDATE battles
    SET status = 'done',
        winner = 'timeout'
    WHERE status = 'active'
      AND started_at IS NOT NULL
      AND started_at <= NOW() - INTERVAL '2 minutes'
    RETURNING
      player1_handle,
      player1_platform,
      player1_name,
      player1_photo,
      player2_handle,
      player2_platform,
      player2_name,
      player2_photo
  `) as TimeoutBattleRow[];

  if (rows.length > 0) {
    await applyTimeoutLosses(rows);
  }
}

