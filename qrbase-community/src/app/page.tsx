import { Navbar } from "@/components/Navbar";
import { TabbedLeaderboard } from "@/components/TabbedLeaderboard";
import { NftDropsBanner } from "@/components/NftDropsBanner";
import { UserRankPanel } from "@/components/UserRankPanel";
import { EarningCards } from "@/components/EarningCards";
import { TasksSection } from "@/components/TasksSection";
import { getLeaderboard, getPointsLeaderboard } from "@/lib/qrbase-api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [leaderboard, pointsLeaderboard] = await Promise.all([
    getLeaderboard(50),
    getPointsLeaderboard(50),
  ]);
  const totalWins = leaderboard.reduce((s, e) => s + e.winsAllTime, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO — 2/3 headline  |  1/3 rank panel
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b-2 border-border">
        {/* blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-accent-purple/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-0 w-[400px] h-[400px] bg-primary/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-14 pb-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

            {/* ── LEFT 2/3 ── */}
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-widest uppercase mb-7">
                🤖 The social QR game on Base
              </div>

              <h1 className="text-6xl sm:text-7xl font-black text-gray-900 leading-[0.95] tracking-tight mb-5">
                Scan QRs.<br />
                <span className="text-primary">Win tokens.</span><br />
                Earn clout.
              </h1>

              <p className="text-lg text-muted max-w-xl mb-9 leading-relaxed">
                Turn every QR code into a puzzle, every puzzle into a win, and every win into{" "}
                <span className="font-bold text-gray-700">on-chain proof you&apos;re built different.</span>
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 mb-10">
                <a
                  href="https://qrbase.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded-2xl bg-primary text-white font-black text-base hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  🎮 Start Scanning →
                </a>
                <a
                  href="#leaderboard"
                  className="px-8 py-4 rounded-2xl bg-white border-2 border-border text-gray-900 font-black text-base hover:border-primary/50 transition-all"
                >
                  🏆 Leaderboard
                </a>
                <a
                  href="#earn"
                  className="px-8 py-4 rounded-2xl bg-accent-purple/10 border-2 border-accent-purple/20 text-accent-purple font-black text-base hover:border-accent-purple/50 transition-all"
                >
                  💰 How to earn
                </a>
              </div>

              {/* stat strip */}
              <div className="flex flex-wrap gap-8">
                {[
                  { value: leaderboard.length.toString(), label: "Ranked Players", icon: "👤" },
                  { value: totalWins.toLocaleString(),    label: "Total Wins",      icon: "🏆" },
                  { value: "3",                           label: "NFT Drops Soon",  icon: "🎁" },
                  { value: "2",                           label: "Platforms",        icon: "⛓"  },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-3xl font-black text-gray-900">{s.value}</div>
                    <div className="text-xs text-muted font-bold uppercase tracking-wide">
                      {s.icon} {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT 1/3 — user rank ── */}
            <div className="lg:sticky lg:top-24">
              <UserRankPanel leaderboard={leaderboard} />
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW TO EARN POINTS
      ══════════════════════════════════════════ */}
      <section id="earn" className="bg-white border-b-2 border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-black text-primary uppercase tracking-widest text-center mb-3">Points System</p>
          <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-3">How to earn points</h2>
          <p className="text-center text-muted text-sm mb-12 max-w-xl mx-auto">
            Stack points to climb the ranks and unlock NFT whitelist spots 🎁 — every action counts, every day.
          </p>
          <EarningCards />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TASKS & BOOSTS
      ══════════════════════════════════════════ */}
      <section className="border-b-2 border-border bg-surface-muted">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <TasksSection />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LEADERBOARD
      ══════════════════════════════════════════ */}
      <section id="leaderboard" className="bg-white border-b-2 border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Hall of Fame</p>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3">Top players, live stats</h2>
          <p className="text-sm text-muted mb-8">
            Top 50 on the <span className="font-bold text-green-700">Points board</span> get guaranteed NFT whitelist spots.{" "}
            <span className="font-bold text-gray-700">Stack points across wins, referrals, purchases &amp; more.</span>
          </p>
          <TabbedLeaderboard winsData={leaderboard} pointsData={pointsLeaderboard} />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          NFT DROPS
      ══════════════════════════════════════════ */}
      <section className="bg-surface-muted border-b-2 border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Rewards</p>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-8">NFT drops coming soon</h2>
          <div className="rounded-3xl border-2 border-border bg-white p-8">
            <NftDropsBanner />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-primary to-accent-purple">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-white">
          <div className="text-5xl mb-4 animate-wiggle inline-block">🤖</div>
          <h2 className="text-5xl font-black mb-4">Ready to scan?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Join hundreds of players already stacking wins on-chain. Your rank is waiting.
          </p>
          <a
            href="https://qrbase.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-4 rounded-2xl bg-white text-primary font-extrabold text-lg hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-0.5"
          >
            Start Playing →
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="border-t-2 border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-black">Q</span>
            </div>
            <span className="font-extrabold text-gray-900">QRbase Community</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="https://qrbase.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-primary font-semibold transition-colors">qrbase.xyz</a>
            <a href="https://twitter.com/qrbasexyz" target="_blank" rel="noopener noreferrer" className="hover:text-primary font-semibold transition-colors">Twitter</a>
            <a href="https://warpcast.com/qrbase" target="_blank" rel="noopener noreferrer" className="hover:text-primary font-semibold transition-colors">Farcaster</a>
          </div>
          <p className="text-xs text-muted">Built by the QRbase team 🤖</p>
        </div>
      </footer>
    </div>
  );
}
