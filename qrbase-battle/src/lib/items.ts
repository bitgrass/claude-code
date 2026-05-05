export type ItemId = "spell_frost" | "shield_guard";
export const ITEMS_COLLECTION_CONTRACT = "0x5B86DcE926cf950d5ccE2C3a591De433B5F0e8f0";

export interface StoreItem {
  id: ItemId;
  name: string;
  kind: "spell" | "shield";
  description: string;
  effectSummary: string;
  nftContract: string | null;
  nftTokenId: string | null;
  buyUrl: string | null;
  imageUrl?: string | null;
  metadataName?: string | null;
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: "spell_frost",
    name: "Frost Hex",
    kind: "spell",
    description: "Cast a freezing blur on your opponent's QR board.",
    effectSummary: "After a short cast, freezes and blurs opponent for 3 seconds",
    nftContract: ITEMS_COLLECTION_CONTRACT,
    nftTokenId: "0",
    buyUrl: `https://thirdweb.com/base/${ITEMS_COLLECTION_CONTRACT}/nfts/0`,
  },
  {
    id: "shield_guard",
    name: "Aegis Shield",
    kind: "shield",
    description: "Cleanse incoming or active Frost Hex effects.",
    effectSummary: "Cancels pending spell and removes freeze/blur effects on you",
    nftContract: ITEMS_COLLECTION_CONTRACT,
    nftTokenId: "1",
    buyUrl: `https://thirdweb.com/base/${ITEMS_COLLECTION_CONTRACT}/nfts/1`,
  },
];

export const STORE_ITEM_IDS: ItemId[] = STORE_ITEMS.map((i) => i.id);

export type ItemInventory = Record<ItemId, number>;

export function emptyInventory(): ItemInventory {
  return {
    spell_frost: 0,
    shield_guard: 0,
  };
}

export function isItemId(value: string | null | undefined): value is ItemId {
  return value === "spell_frost" || value === "shield_guard";
}
