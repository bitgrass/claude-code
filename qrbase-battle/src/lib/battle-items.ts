import { sql } from "@/lib/db";
import type { BattleRow } from "@/lib/db";
import { STORE_ITEM_IDS, type ItemId, emptyInventory, type ItemInventory } from "@/lib/items";

export interface BattleInventories {
  player1: ItemInventory;
  player2: ItemInventory;
}

function toQuantity(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function normalizeItemInventory(rows: Array<{ item_id: string; quantity: unknown }>): ItemInventory {
  const out = emptyInventory();
  for (const row of rows) {
    const itemId = row.item_id as ItemId;
    if (!STORE_ITEM_IDS.includes(itemId)) continue;
    out[itemId] = toQuantity(row.quantity);
  }
  return out;
}

export async function getBattleInventories(room: BattleRow): Promise<BattleInventories> {
  const p1Rows = await sql`
    SELECT item_id, quantity
    FROM user_items
    WHERE handle = ${room.player1_handle}
      AND platform = ${room.player1_platform}
      AND item_id IN (${STORE_ITEM_IDS[0]}, ${STORE_ITEM_IDS[1]})
  `;

  const p2Rows =
    room.player2_handle && room.player2_platform
      ? await sql`
          SELECT item_id, quantity
          FROM user_items
          WHERE handle = ${room.player2_handle}
            AND platform = ${room.player2_platform}
            AND item_id IN (${STORE_ITEM_IDS[0]}, ${STORE_ITEM_IDS[1]})
        `
      : [];

  return {
    player1: normalizeItemInventory(p1Rows as Array<{ item_id: string; quantity: unknown }>),
    player2: normalizeItemInventory(p2Rows as Array<{ item_id: string; quantity: unknown }>),
  };
}

export async function finalizeBattleItemTimingsByRoomId(roomId: string) {
  await sql`
    UPDATE battles
    SET
      player1_freeze_until = CASE
        WHEN player1_pending_spell_until IS NOT NULL AND player1_pending_spell_until <= NOW()
          THEN NOW() + INTERVAL '3 seconds'
        ELSE player1_freeze_until
      END,
      player2_freeze_until = CASE
        WHEN player2_pending_spell_until IS NOT NULL AND player2_pending_spell_until <= NOW()
          THEN NOW() + INTERVAL '3 seconds'
        ELSE player2_freeze_until
      END,
      player1_blur_until = CASE
        WHEN player1_pending_spell_until IS NOT NULL AND player1_pending_spell_until <= NOW()
          THEN NOW() + INTERVAL '3 seconds'
        ELSE player1_blur_until
      END,
      player2_blur_until = CASE
        WHEN player2_pending_spell_until IS NOT NULL AND player2_pending_spell_until <= NOW()
          THEN NOW() + INTERVAL '3 seconds'
        ELSE player2_blur_until
      END,
      player1_pending_spell_until = CASE
        WHEN player1_pending_spell_until IS NOT NULL AND player1_pending_spell_until <= NOW() THEN NULL
        ELSE player1_pending_spell_until
      END,
      player2_pending_spell_until = CASE
        WHEN player2_pending_spell_until IS NOT NULL AND player2_pending_spell_until <= NOW() THEN NULL
        ELSE player2_pending_spell_until
      END
    WHERE id = ${roomId}
      AND status = 'active'
  `;

  await sql`
    UPDATE battles
    SET
      player1_casting_until = CASE
        WHEN player1_casting_until IS NOT NULL AND player1_casting_until <= NOW() THEN NULL
        ELSE player1_casting_until
      END,
      player2_casting_until = CASE
        WHEN player2_casting_until IS NOT NULL AND player2_casting_until <= NOW() THEN NULL
        ELSE player2_casting_until
      END,
      player1_freeze_until = CASE
        WHEN player1_freeze_until IS NOT NULL AND player1_freeze_until <= NOW() THEN NULL
        ELSE player1_freeze_until
      END,
      player2_freeze_until = CASE
        WHEN player2_freeze_until IS NOT NULL AND player2_freeze_until <= NOW() THEN NULL
        ELSE player2_freeze_until
      END,
      player1_blur_until = CASE
        WHEN player1_blur_until IS NOT NULL AND player1_blur_until <= NOW() THEN NULL
        ELSE player1_blur_until
      END,
      player2_blur_until = CASE
        WHEN player2_blur_until IS NOT NULL AND player2_blur_until <= NOW() THEN NULL
        ELSE player2_blur_until
      END
    WHERE id = ${roomId}
      AND status = 'active'
  `;
}
