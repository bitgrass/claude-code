import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "QRbase Airdrop — Claim Your USDC Reward on Base",
  description:
    "Solve QR challenges, verify your identity, and claim USDC rewards on Base blockchain.",
  openGraph: {
    title: "QRbase Airdrop",
    description: "Claim your QRbase USDC reward on Base",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen qr-pattern">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
