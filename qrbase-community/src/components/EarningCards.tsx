// Points per action — mirrors constants in qrbase-api.ts getPointsLeaderboard()
// LIVE actions are tracked NOW in the Points leaderboard
// SOON actions will be added once the worker exposes those leaderboard tabs
//
// Economy % breakdown (must sum to 100%):
//  28 + 22 + 12 + 10 + 7 + 6 + 5 + 4 + 3 + 2 + 1 = 100 ✓
const EARNING_METHODS = [
  {
    id: "campaign-creation",
    icon: "📡",
    title: "Create Campaign",
    pts: "+2,000 pts",
    ptsLabel: "per scan-mode campaign",
    pct: 28,
    desc: "Deploy a full QR scan-mode campaign page. The single highest-value action in the ecosystem — you're building the game.",
    bonus: "🏆 Highest point value of any action",
    accent: "primary" as const,
    live: false,
  },
  {
    id: "puzzle-wins",
    icon: "🧩",
    title: "Puzzle Wins",
    pts: "+100 pts",
    ptsLabel: "per win",
    pct: 22,
    desc: "Every puzzle you crack earns points. Win more, climb higher, get whitelisted.",
    bonus: "🔥 Based on all-time wins — every W counts",
    accent: "primary" as const,
    live: true,
  },
  {
    id: "scan-mode-wins",
    icon: "📷",
    title: "Scan Mode Wins",
    pts: "+150 pts",
    ptsLabel: "per scan-mode win",
    pct: 12,
    desc: "Win QR scan challenges on campaign pages. Higher reward than standard puzzle wins.",
    bonus: "📷 Premium point reward for scan-mode play",
    accent: "purple" as const,
    live: false,
  },
  {
    id: "create-puzzle-game",
    icon: "🎮",
    title: "Create Puzzle Game",
    pts: "+500 pts",
    ptsLabel: "per puzzle game created",
    pct: 10,
    desc: "Create a new QR puzzle game and share it with the community. Content creators power the ecosystem.",
    bonus: "🧩 Second highest creation reward",
    accent: "purple" as const,
    live: false,
  },
  {
    id: "task-creation",
    icon: "📋",
    title: "Task Creation",
    pts: "+300 pts",
    ptsLabel: "per task created",
    pct: 7,
    desc: "Create social tasks as a promoter and earn points for every task you deploy to the ecosystem.",
    bonus: "📣 Promoters = ecosystem builders",
    accent: "primary" as const,
    live: false,
  },
  {
    id: "level-bonus",
    icon: "⭐",
    title: "Level Up Bonus",
    pts: "+50 pts",
    ptsLabel: "per level above 1",
    pct: 6,
    desc: "Every level you reach adds a permanent bonus to your total points. Level up by playing more and winning consistently.",
    bonus: "🤖 Lv.6 = +250 pts · auto-applied to your score",
    accent: "purple" as const,
    live: true,
  },
  {
    id: "referrals",
    icon: "👥",
    title: "Referrals",
    pts: "+75 pts",
    ptsLabel: "per referred fren",
    pct: 5,
    desc: "Bring frens who play. Every successful referral stacks points for you — viral gaming, literally.",
    bonus: "🤝 Counted from your referral stats",
    accent: "primary" as const,
    live: true,
  },
  {
    id: "boost-token",
    icon: "⚡",
    title: "Boost Token Bought",
    pts: "+100 pts",
    ptsLabel: "per boost purchased",
    pct: 4,
    desc: "Buy boost tokens to supercharge your gameplay and earn bonus points instantly on every purchase.",
    bonus: "⚡ Instant pts credited on buy",
    accent: "purple" as const,
    live: false,
  },
  {
    id: "scan-holdings",
    icon: "🪙",
    title: "$SCAN Holdings",
    pts: "+5 pts",
    ptsLabel: "per 1,000 SCAN / day",
    pct: 3,
    desc: "Hold $SCAN tokens and earn passive points daily. Snapshot every 24h — the more you hold, the more you earn.",
    bonus: "💎 10,000 SCAN = 50 pts/day passive",
    accent: "primary" as const,
    live: false,
  },
  {
    id: "task-completion",
    icon: "✅",
    title: "Task Completion",
    pts: "+25 pts",
    ptsLabel: "per task completed",
    pct: 2,
    desc: "Complete social quests — follow accounts, post QR codes, engage with content for guaranteed pts.",
    bonus: "📋 New tasks appear regularly",
    accent: "purple" as const,
    live: false,
  },
  {
    id: "attempt-purchases",
    icon: "🎯",
    title: "Buying Attempts",
    pts: "+10 pts",
    ptsLabel: "per attempt bought",
    pct: 1,
    desc: "Buy puzzle attempt packs to keep playing and earn bonus points on every purchase.",
    bonus: "⚡ Instant pts credited — all-time total counts",
    accent: "primary" as const,
    live: true,
  },
];

const STYLES = {
  primary: {
    border: "border-primary/30 hover:border-primary",
    badge:  "bg-primary/10 text-primary",
    icon:   "bg-primary text-white",
    pts:    "text-primary",
  },
  purple: {
    border: "border-accent-purple/30 hover:border-accent-purple",
    badge:  "bg-accent-purple/10 text-accent-purple",
    icon:   "bg-accent-purple text-white",
    pts:    "text-accent-purple",
  },
};

export function EarningCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {EARNING_METHODS.map((m) => {
        const s = STYLES[m.accent];
        return (
          <div
            key={m.id}
            className={`rounded-3xl border-2 bg-white ${s.border} p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all relative`}
          >
            {/* Live / Soon badge */}
            <div className="absolute top-4 right-4">
              {m.live ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide">
                  ✅ LIVE
                </span>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface-muted text-muted border border-border uppercase tracking-wide">
                  ⏳ SOON
                </span>
              )}
            </div>

            {/* Top row */}
            <div className="flex items-start justify-between pr-14">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${s.icon}`}>
                {m.icon}
              </span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${s.badge} uppercase tracking-wide`}>
                {m.pct}% of economy
              </span>
            </div>

            {/* Title + pts */}
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{m.title}</h3>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-2xl font-black ${s.pts}`}>{m.pts}</span>
                <span className="text-xs text-muted font-semibold">{m.ptsLabel}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted leading-relaxed">{m.desc}</p>

            {/* Bonus */}
            <div className="mt-auto pt-3 border-t border-border">
              <p className="text-xs font-bold text-gray-700">{m.bonus}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
