import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { TabbedLeaderboard } from "@/components/TabbedLeaderboard";
import { NftDropsBanner } from "@/components/NftDropsBanner";
import { EarningCards } from "@/components/EarningCards";
import { TasksSection } from "@/components/TasksSection";
import { getLeaderboard, getPointsLeaderboard, getSkilledLeaderboardServer } from "@/lib/qrbase-api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [leaderboard, pointsLeaderboard, skilledLeaderboard] = await Promise.all([
    getLeaderboard(50),
    getPointsLeaderboard(50),
    getSkilledLeaderboardServer(50),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO — robot left  |  top 3 right
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-b-2 border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-accent-purple/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-0 w-[400px] h-[400px] bg-primary/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-14 pb-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* ── LEFT — robot + tagline ── */}
            <div className="flex flex-col items-center text-center">
              <Image
                src="/bot1.png"
                alt="QRbase Robot"
                width={480}
                height={480}
                className="drop-shadow-xl w-72 sm:w-96 lg:w-[480px] animate-float"
                priority
              />
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mt-6">
                Win puzzles.<br />
                <span className="text-primary">Scan QRs.</span>
              </h1>
              <p className="text-muted text-base mt-3 max-w-sm">
                Turn every QR code into a puzzle, every win into on-chain clout.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-7">
                <a
                  href="https://qrbase.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-7 py-3.5 rounded-2xl bg-primary text-white font-black text-sm hover:bg-primary-dark transition-all shadow-lg hover:-translate-y-0.5"
                >
                  🎮 Start Scanning →
                </a>
                <a
                  href="#leaderboard"
                  className="px-7 py-3.5 rounded-2xl bg-white border-2 border-border text-gray-900 font-black text-sm hover:border-primary/50 transition-all"
                >
                  🏆 Leaderboard
                </a>
              </div>
            </div>

            {/* ── RIGHT — top 3 leaderboard ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-black text-primary uppercase tracking-widest">Top Players</p>
                <span className="text-xs font-bold text-muted">{leaderboard.length} ranked</span>
              </div>

              {leaderboard.slice(0, 3).map((player, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={player.handle}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 bg-white transition-all ${
                      i === 0 ? "border-yellow-300 shadow-md" :
                      i === 1 ? "border-gray-300" :
                      "border-orange-200"
                    }`}
                  >
                    <span className="text-3xl">{medals[i]}</span>
                    {player.profilePhoto ? (
                      <Image
                        src={player.profilePhoto}
                        alt={player.displayName}
                        width={44}
                        height={44}
                        className="rounded-full ring-2 ring-border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-surface-muted border-2 border-border flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-gray-900 text-sm truncate">{player.displayName || player.handle}</p>
                      <p className="text-xs text-muted font-semibold">@{player.handle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900 text-lg">{player.winsAllTime}</p>
                      <p className="text-[10px] text-muted font-bold uppercase">wins</p>
                    </div>
                  </div>
                );
              })}

              <a
                href="#leaderboard"
                className="text-center text-xs font-black text-primary hover:underline mt-1"
              >
                View full leaderboard →
              </a>
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
          <p className="text-sm text-muted mb-2">
            The <span className="font-bold text-green-700">Points board</span> is the official WL board —{" "}
            <span className="font-bold text-gray-900">top 50 get guaranteed NFT whitelist spots 🎁</span>
          </p>
          <p className="text-sm text-muted mb-8">
            More point sources coming soon:{" "}
            <span className="font-semibold text-gray-700">campaigns, boosts, scan-mode wins, task creation, $SCAN holdings &amp; more.</span>
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: "680px" }}>
            {/* leaderboard */}
            <div className="h-[680px]">
              <TabbedLeaderboard winsData={leaderboard} pointsData={pointsLeaderboard} />
            </div>

            {/* bot mascot + #1 golden card */}
            <div className="hidden lg:flex flex-col items-center justify-between h-full sticky top-24 gap-4">
              <Image
                src="/botL.png"
                alt="QRbase Robot"
                width={800}
                height={800}
                className="w-[85%] h-auto drop-shadow-2xl animate-float"
              />

              {/* #1 player golden card */}
              {leaderboard[0] && (() => {
                const p = leaderboard[0];
                const skilled = skilledLeaderboard.find((s) => s.handle === p.handle);
                return (
                  <div className="w-full rounded-2xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 p-4 shadow-lg shadow-yellow-200/50">
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-lg">🥇</span>
                      <span className="text-xs font-black text-yellow-700 uppercase tracking-widest">Champion</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.profilePhoto ? (
                        <Image
                          src={p.profilePhoto}
                          alt={p.displayName}
                          width={48}
                          height={48}
                          className="rounded-full ring-2 ring-yellow-400 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-yellow-100 border-2 border-yellow-300 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-gray-900 truncate">{p.displayName || p.handle}</p>
                        <p className="text-xs text-yellow-700 font-bold">@{p.handle}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="text-center bg-white/60 rounded-xl py-2 border border-yellow-200">
                        <p className="text-lg font-black text-gray-900">{p.winsAllTime}</p>
                        <p className="text-[10px] font-bold text-yellow-700 uppercase">Wins</p>
                      </div>
                      <div className="text-center bg-white/60 rounded-xl py-2 border border-yellow-200">
                        <p className="text-lg font-black text-gray-900">Lv.{skilled?.level ?? p.level}</p>
                        <p className="text-[10px] font-bold text-yellow-700 uppercase">Level</p>
                      </div>
                      <div className="text-center bg-white/60 rounded-xl py-2 border border-yellow-200">
                        <p className="text-lg font-black text-gray-900">{Math.round(skilled?.winRate ?? 0)}%</p>
                        <p className="text-[10px] font-bold text-yellow-700 uppercase">Win rate</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          NFT DROPS
      ══════════════════════════════════════════ */}
      <section className="bg-surface-muted border-b-2 border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 mb-20">
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
      <section className="relative bg-gradient-to-br from-primary to-accent-purple overflow-visible">
        {/* bot sitting on top border — absolutely positioned, centered, half above */}
        <Image
          src="/botS.png"
          alt=""
          width={1200}
          height={1200}
          className="absolute -top-[272px] left-1/2 -translate-x-1/2 w-[600px] h-auto drop-shadow-2xl"
        />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-white">
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
          <Image src="/logo.svg" alt="QRbase Community" width={160} height={40} className="h-8 w-auto" />
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
