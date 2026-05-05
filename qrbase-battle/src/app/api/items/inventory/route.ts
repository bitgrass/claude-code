import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { STORE_ITEM_IDS, emptyInventory } from "@/lib/items";
import { getWalletItemBalances } from "@/lib/erc1155";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle")?.trim() ?? "";
  const platform = req.nextUrl.searchParams.get("platform") === "farcaster" ? "farcaster" : "twitter";
  const walletAddress = req.nextUrl.searchParams.get("walletAddress")?.trim() ?? "";
  const sync = req.nextUrl.searchParams.get("sync") === "1";

  if (!handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }

  if (sync && walletAddress) {
    try {
      const onchain = await getWalletItemBalances(walletAddress);
      await sql`
        INSERT INTO user_items (handle, platform, item_id, quantity, used_count)
        VALUES (${handle}, ${platform}, ${STORE_ITEM_IDS[0]}, ${onchain.spell_frost}, 0)
        ON CONFLICT (handle, platform, item_id) DO UPDATE SET
          quantity = ${onchain.spell_frost},
          used_count = 0,
          updated_at = NOW()
      `;
      await sql`
        INSERT INTO user_items (handle, platform, item_id, quantity, used_count)
        VALUES (${handle}, ${platform}, ${STORE_ITEM_IDS[1]}, ${onchain.shield_guard}, 0)
        ON CONFLICT (handle, platform, item_id) DO UPDATE SET
          quantity = ${onchain.shield_guard},
          used_count = 0,
          updated_at = NOW()
      `;
    } catch {
      // keep best-effort inventory fetch from DB
    }
  }

  const rows = await sql`
    SELECT item_id, quantity AS available
    FROM user_items
    WHERE handle = ${handle}
      AND platform = ${platform}
      AND item_id IN (${STORE_ITEM_IDS[0]}, ${STORE_ITEM_IDS[1]})
  `;

  const inventory = emptyInventory();
  for (const row of rows as Array<{ item_id: string; available: number }>) {
    if (row.item_id === STORE_ITEM_IDS[0] || row.item_id === STORE_ITEM_IDS[1]) {
      inventory[row.item_id] = Math.max(0, Number(row.available) || 0);
    }
  }

  return NextResponse.json({ inventory });
}
