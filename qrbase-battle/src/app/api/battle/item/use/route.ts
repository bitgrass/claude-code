import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { BattleRow } from "@/lib/db";
import { STORE_ITEMS, isItemId } from "@/lib/items";
import { finalizeBattleItemTimingsByRoomId, getBattleInventories } from "@/lib/battle-items";
import { getErc1155Balance, verifyErc1155BurnTransaction } from "@/lib/erc1155";
import { normalizeAddress } from "@/lib/erc1155-abi";

const SPELL_CAST_MS = 1200;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const handle = typeof body.handle === "string" ? body.handle.trim() : "";
  const platform = body.platform === "farcaster" ? "farcaster" : "twitter";
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const burnTxHash = typeof body.burnTxHash === "string" ? body.burnTxHash.trim() : "";
  const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";

  if (!roomId || !handle || !isItemId(itemId)) {
    return NextResponse.json({ error: "roomId, handle, itemId required" }, { status: 400 });
  }
  if (!burnTxHash || !walletAddress) {
    return NextResponse.json({ error: "walletAddress and burnTxHash required" }, { status: 400 });
  }

  const roomRows = await sql`SELECT * FROM battles WHERE id = ${roomId}`;
  if (roomRows.length === 0) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const room = roomRows[0] as BattleRow;
  if (room.status !== "active") {
    return NextResponse.json({ error: "Battle is not active" }, { status: 409 });
  }

  const isP1 = room.player1_handle === handle && room.player1_platform === platform;
  const isP2 = room.player2_handle === handle && room.player2_platform === platform;
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const wallet = normalizeAddress(walletAddress);
  if (!wallet) {
    return NextResponse.json({ error: "Invalid walletAddress" }, { status: 400 });
  }

  const storeItem = STORE_ITEMS.find((item) => item.id === itemId);
  if (!storeItem?.nftContract || !storeItem.nftTokenId) {
    return NextResponse.json({ error: "Item is not configured on-chain" }, { status: 409 });
  }

  const burnCheck = await verifyErc1155BurnTransaction({
    txHash: burnTxHash,
    contractAddress: storeItem.nftContract,
    walletAddress: wallet,
    tokenId: storeItem.nftTokenId,
    minAmount: BigInt(1),
  });
  if (!burnCheck.ok) {
    return NextResponse.json({ error: burnCheck.reason ?? "Invalid burn transaction" }, { status: 409 });
  }

  const consumeRows = await sql`
    INSERT INTO item_consumptions (tx_hash, handle, platform, item_id, wallet_address)
    VALUES (${burnTxHash.toLowerCase()}, ${handle}, ${platform}, ${itemId}, ${wallet})
    ON CONFLICT (tx_hash) DO NOTHING
    RETURNING tx_hash
  `;
  if (consumeRows.length === 0) {
    return NextResponse.json({ error: "This burn transaction was already used" }, { status: 409 });
  }

  try {
    const onchainBalance = await getErc1155Balance(storeItem.nftContract, wallet, storeItem.nftTokenId);
    const safeBalance =
      onchainBalance > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(onchainBalance);

    await sql`
      INSERT INTO user_items (handle, platform, item_id, quantity, used_count)
      VALUES (${handle}, ${platform}, ${itemId}, ${safeBalance}, 0)
      ON CONFLICT (handle, platform, item_id) DO UPDATE SET
        quantity = ${safeBalance},
        used_count = 0,
        updated_at = NOW()
    `;
  } catch {
    // Item is already consumed on-chain; proceed even if balance sync fails transiently.
  }

  if (itemId === "spell_frost") {
    if (isP1) {
      await sql`
        UPDATE battles
        SET
          player2_pending_spell_until = NOW() + (${SPELL_CAST_MS} * INTERVAL '1 millisecond'),
          player1_casting_until = NOW() + (${SPELL_CAST_MS} * INTERVAL '1 millisecond')
        WHERE id = ${roomId}
      `;
    } else {
      await sql`
        UPDATE battles
        SET
          player1_pending_spell_until = NOW() + (${SPELL_CAST_MS} * INTERVAL '1 millisecond'),
          player2_casting_until = NOW() + (${SPELL_CAST_MS} * INTERVAL '1 millisecond')
        WHERE id = ${roomId}
      `;
    }
  } else if (itemId === "shield_guard") {
    if (isP1) {
      await sql`
        UPDATE battles
        SET
          player1_pending_spell_until = NULL,
          player1_freeze_until = NULL,
          player1_blur_until = NULL,
          player2_casting_until = NULL
        WHERE id = ${roomId}
      `;
    } else {
      await sql`
        UPDATE battles
        SET
          player2_pending_spell_until = NULL,
          player2_freeze_until = NULL,
          player2_blur_until = NULL,
          player1_casting_until = NULL
        WHERE id = ${roomId}
      `;
    }
  }

  await finalizeBattleItemTimingsByRoomId(roomId);

  const updatedRows = await sql`SELECT * FROM battles WHERE id = ${roomId}`;
  const updatedRoom = updatedRows[0] as BattleRow;
  const items = await getBattleInventories(updatedRoom);

  return NextResponse.json({ room: updatedRoom, items });
}
