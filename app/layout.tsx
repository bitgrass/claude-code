import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, IBM_Plex_Sans_Arabic } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-plex-arabic",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.meta.url),
  title: {
    default: site.meta.title,
    template: "%s — AOR Green",
  },
  description: site.meta.description,
  applicationName: "AOR Green",
  authors: [{ name: "AOR Green" }],
  keywords: [
    "AOR Green",
    "Area of Responsibility Green",
    "MENA arid belt",
    "regenerative cultivation",
    "Miscanthus",
    "Paulownia",
    "sovereign partnership",
    "Article 6.2",
    "Tunisia",
    "Sfax",
    "land restoration",
  ],
  openGraph: {
    type: "website",
    url: site.meta.url,
    siteName: "AOR Green",
    title: site.meta.ogTitle,
    description: site.meta.ogDescription,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: site.meta.ogTitle,
    description: site.meta.ogDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: site.meta.url,
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${plexArabic.variable}`}
    >
      <body>
        <a
          href="#top"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-sovereign focus:text-cream focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
