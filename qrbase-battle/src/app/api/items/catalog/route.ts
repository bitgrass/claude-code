import { NextResponse } from "next/server";
import { STORE_ITEMS } from "@/lib/items";
import { getErc1155TokenMetadata } from "@/lib/erc1155";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await Promise.all(
    STORE_ITEMS.map(async (item) => {
      if (!item.nftContract || !item.nftTokenId) {
        return item;
      }

      try {
        const metadata = await getErc1155TokenMetadata(item.nftContract, item.nftTokenId);
        return {
          ...item,
          imageUrl: metadata.imageUrl,
          metadataName: metadata.name,
        };
      } catch {
        return item;
      }
    })
  );

  return NextResponse.json({ items });
}
