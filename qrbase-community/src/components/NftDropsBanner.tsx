"use client";

const DROPS = [
  {
    id: 1,
    name: "QRbase OG Badge",
    description: "For the earliest players. Top 100 all-time wins.",
    emoji: "🔷",
    status: "upcoming",
    supply: 100,
    requirement: "Top 100 wins",
    bg: "from-blue-500/10 to-primary/5",
    accent: "text-primary",
    border: "border-primary/20",
  },
  {
    id: 2,
    name: "Puzzle Master",
    description: "Complete 500+ puzzle wins across any token.",
    emoji: "🧩",
    status: "upcoming",
    supply: 500,
    requirement: "500+ puzzle wins",
    bg: "from-purple-500/10 to-accent-purple/5",
    accent: "text-accent-purple",
    border: "border-purple-200",
  },
  {
    id: 3,
    name: "Diamond Hands",
    description: "Hold $SCAN + win 100 SCAN puzzles.",
    emoji: "💎",
    status: "upcoming",
    supply: 250,
    requirement: "100 SCAN wins",
    bg: "from-cyan-500/10 to-teal-500/5",
    accent: "text-teal-600",
    border: "border-teal-200",
  },
];

export function NftDropsBanner() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900">NFT Drops</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/20 text-warning animate-pulse">
          Coming Soon
        </span>
      </div>
      <p className="text-sm text-muted mb-6">
        Earn whitelist spots based on your QRbase stats. The better you play, the more you unlock. 🎮
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DROPS.map((drop) => (
          <div
            key={drop.id}
            className={`rounded-2xl border ${drop.border} bg-gradient-to-br ${drop.bg} p-5 flex flex-col gap-3`}
          >
            <div className="text-4xl">{drop.emoji}</div>
            <div>
              <h3 className={`font-bold text-base ${drop.accent}`}>{drop.name}</h3>
              <p className="text-xs text-muted mt-1">{drop.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-white/60 text-gray-700">
                {drop.requirement}
              </span>
              <span className="text-xs text-muted">{drop.supply} spots</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
