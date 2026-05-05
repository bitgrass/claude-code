import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isItemId, STORE_ITEM_IDS, emptyInventory } from "@/lib/items";
import { getWalletItemBalances } from "@/lib/erc1155";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const handle = typeof body.handle === "string" ? body.handle.trim() : "";
  const platform = body.platform === "farcaster" ? "farcaster" : "twitter";
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";

  if (!handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  if (!isItemId(itemId)) {
    return NextResponse.json({ error: "invalid itemId" }, { status: 400 });
  }
  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  }

  const onchain = await getWalletItemBalances(walletAddress);
  const latestQty = onchain[itemId];

  await sql`
    INSERT INTO user_items (handle, platform, item_id, quantity, used_count)
    VALUES (${handle}, ${platform}, ${itemId}, ${latestQty}, 0)
    ON CONFLICT (handle, platform, item_id) DO UPDATE SET
      quantity = ${latestQty},
      used_count = 0,
      updated_at = NOW()
  `;

  const rows = await sql`
    SELECT item_id, quantity AS available
    FROM user_items
    WHERE handle = ${handle}
      AND platform = ${platform}
      AND item_id IN (${STORE_ITEM_IDS[0]}, ${STORE_ITEM_IDS[1]})
  `;

  const inventory = emptyInventory();
  for (const row of rows as Array<{ item_id: string; available: number }>) {
    if (isItemId(row.item_id)) {
      inventory[row.item_id] = Math.max(0, Number(row.available) || 0);
    }
  }

  return NextResponse.json({ ok: true, inventory, syncedOnchainBalance: latestQty });
}
