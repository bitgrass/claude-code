"use client";

// ─── Single 777-supply collection, 3 mint tiers by Points board rank ──────
const TIERS = [
  {
    id: "genesis",
    rank: "#1 – #50",
    rankRange: [1, 50],
    name: "QRbase OG",
    tagline: "You built this.",
    desc: "Top 50 on the Points board. Free mint, forever. The rarest tier — your name on the collection from day one.",
    emoji: "👑",
    price: "FREE",
    priceLabel: "mint",
    supply: 50,
    rarity: "LEGENDARY",
    mechanism: "Top 50 · Points board",
    live: true,
    bg: "from-primary/10 via-primary/5 to-white",
    border: "border-primary/40",
    topBar: "from-primary via-accent-purple to-primary",
    priceBg: "bg-primary text-white",
    badge: "bg-primary text-white",
    accent: "text-primary",
    supplyColor: "text-primary",
  },
  {
    id: "pioneer",
    rank: "#51 – #100",
    rankRange: [51, 100],
    name: "QRbase Hunters",
    tagline: "Early enough to matter.",
    desc: "Ranks 51–100 on the Points board. Semi-price mint — you were early, you grinded, and you get rewarded for it.",
    emoji: "⚡",
    price: "50%",
    priceLabel: "off public price",
    supply: 50,
    rarity: "RARE",
    mechanism: "Rank 51–100 · Points board",
    live: true,
    bg: "from-accent-purple/8 via-accent-purple/3 to-white",
    border: "border-accent-purple/30",
    topBar: "from-accent-purple via-primary to-accent-purple",
    priceBg: "bg-accent-purple text-white",
    badge: "bg-accent-purple text-white",
    accent: "text-accent-purple",
    supplyColor: "text-accent-purple",
  },
  {
    id: "public",
    rank: "#101 – open",
    rankRange: [101, 777],
    name: "Public Mint",
    tagline: "Still worth it.",
    desc: "677 remaining NFTs minted at the public price. Open to everyone — but the best traits and perks go to top-tier holders.",
    emoji: "🎟️",
    price: "PUBLIC",
    priceLabel: "price",
    supply: 677,
    rarity: "STANDARD",
    mechanism: "Open mint · public price",
    live: false,
    bg: "from-gray-50 via-white to-white",
    border: "border-border",
    topBar: "from-gray-300 via-gray-400 to-gray-300",
    priceBg: "bg-surface-muted text-gray-700",
    badge: "bg-surface-muted text-muted",
    accent: "text-gray-700",
    supplyColor: "text-muted",
  },
];

export function NftDropsBanner() {
  const totalSupply = TIERS.reduce((s, t) => s + t.supply, 0);

  return (
    <div>
      {/* Collection header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-extrabold text-gray-900">🎁 NFT Collection</h2>
            <span className="text-xs font-black px-3 py-1 rounded-full bg-warning/20 text-warning border border-warning/30 animate-pulse">
              SOON™
            </span>
          </div>
          <p className="text-sm text-muted font-medium">
            One collection. Three tiers. Your rank on the Points board decides which one you get.
          </p>
        </div>
        {/* Supply pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center px-5 py-3 rounded-2xl border-2 border-primary/20 bg-primary/5">
            <p className="text-3xl font-black text-primary tabular-nums">{totalSupply}</p>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest">total supply</p>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`rounded-3xl border-2 ${tier.border} bg-gradient-to-br ${tier.bg} p-6 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 relative overflow-hidden`}
          >
            {/* Rarity gradient top bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tier.topBar}`} />

            {/* Top row */}
            <div className="flex items-start justify-between pt-1">
              <span className="text-4xl leading-none">{tier.emoji}</span>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${tier.badge} uppercase tracking-widest`}>
                  {tier.rarity}
                </span>
                <span className="text-[10px] font-bold text-muted bg-surface-muted px-2 py-0.5 rounded-full">
                  {tier.rank}
                </span>
              </div>
            </div>

            {/* Name + tagline */}
            <div>
              <h3 className={`font-black text-xl leading-tight ${tier.accent}`}>{tier.name}</h3>
              <p className="text-xs font-bold text-gray-500 mt-0.5 italic">&ldquo;{tier.tagline}&rdquo;</p>
            </div>

            {/* Description */}
            <p className="text-sm text-muted leading-relaxed">{tier.desc}</p>

            {/* Price + supply */}
            <div className="mt-auto pt-4 border-t border-black/5 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Mint price</p>
                <span className={`text-sm font-black px-3 py-1.5 rounded-xl inline-block ${tier.priceBg}`}>
                  {tier.price}
                </span>
                <p className="text-[10px] text-muted mt-0.5">{tier.priceLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Supply</p>
                <p className={`text-2xl font-black tabular-nums ${tier.supplyColor}`}>{tier.supply}</p>
                <p className="text-[10px] font-bold text-muted">
                  {((tier.supply / totalSupply) * 100).toFixed(1)}% of collection
                </p>
              </div>
            </div>

            {/* Qualification */}
            <div className={`rounded-xl px-3 py-2 ${tier.live ? "bg-green-50 border border-green-200" : "bg-surface-muted border border-border"}`}>
              <p className={`text-[11px] font-black ${tier.live ? "text-green-700" : "text-muted"}`}>
                {tier.live ? "✅" : "⏳"} {tier.mechanism}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="mt-6 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent-purple/5 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black text-gray-900 text-sm">
            Points race is live — your rank determines your tier.
          </p>
          <p className="text-xs text-muted mt-0.5">
            Top 50 = free mint &nbsp;·&nbsp; 51–100 = 50% off &nbsp;·&nbsp; 101+ = public price &nbsp;·&nbsp; 777 total supply
          </p>
        </div>
        <a
          href="#leaderboard"
          className="px-5 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap"
        >
          Check my rank →
        </a>
      </div>
    </div>
  );
}
