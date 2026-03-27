import { Navbar } from "@/components/Navbar";
import { Leaderboard } from "@/components/Leaderboard";
import { UserStatsCard } from "@/components/UserStatsCard";
import { NftDropsBanner } from "@/components/NftDropsBanner";
import { getLeaderboard } from "@/lib/qrbase-api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const leaderboard = await getLeaderboard(50);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-blue-700 text-white p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">QRbase Community 🏆</h1>
              <p className="mt-1 text-blue-100">
                Top players, live stats & upcoming NFT drops
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{leaderboard.length}</div>
                <div className="text-xs text-blue-200">Players Ranked</div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {leaderboard.reduce((s, e) => s + e.winsAllTime, 0).toLocaleString()}
                </div>
                <div className="text-xs text-blue-200">Total Wins</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Leaderboard — takes 2 cols */}
          <div className="lg:col-span-2 rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">🏆 Leaderboard</h2>
              <span className="text-xs text-muted">All-time wins</span>
            </div>
            <Leaderboard entries={leaderboard} />
          </div>

          {/* Sidebar: user stats */}
          <div className="space-y-6">
            <UserStatsCard />

            {/* CTA when not logged in */}
            <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-accent-purple/5 p-6 text-center">
              <div className="text-3xl mb-2">🎮</div>
              <h3 className="font-bold text-gray-900">See Your Rank</h3>
              <p className="text-sm text-muted mt-1 mb-4">
                Sign in to check your position, stats, and NFT whitelist eligibility.
              </p>
              <a
                href="https://qrbase.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-semibold text-primary hover:underline"
              >
                Don't play yet? Start on QRbase →
              </a>
            </div>
          </div>
        </div>

        {/* NFT Drops */}
        <div className="rounded-3xl border border-border bg-white shadow-sm p-6">
          <NftDropsBanner />
        </div>

      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-muted">
        Built by the QRbase team · <a href="https://qrbase.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-primary">qrbase.xyz</a>
      </footer>
    </div>
  );
}
