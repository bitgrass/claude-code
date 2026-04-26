# AOR Green — Institutional Website

Public institutional website for **AOR Green — Area of Responsibility : Green**.

This is the institutional digital dossier of AOR Green, the long-horizon
regenerative operator of the MENA arid belt, restoring degraded land to
productivity at industrial scale, in sovereign partnership with states, and
returning value to the communities whose land is cultivated.

The site is built as a single, restrained, editorial homepage. It is not a
startup landing page, not a Web3 page, not a carbon-credit marketplace, and
not an agriculture brochure. It is closer in register to a policy paper than
to a brochure.

## Stack

- Next.js 14 (App Router, static generation)
- React 18, TypeScript (strict)
- Tailwind CSS 3
- Inter (Latin), Fraunces (editorial serif), IBM Plex Sans Arabic — all
  open-source, served via `next/font`
- No animation libraries, no UI kits, no decorative-icon libraries

## Local development

Requires Node.js 18.18+ (tested on Node 22).

```bash
npm install
npm run dev
```

The site is then available at `http://localhost:3000`.

Other scripts:

```bash
npm run lint    # ESLint via next lint
npm run build   # Production build (static)
npm run start   # Serve the production build
```

## Project structure

```
app/
  layout.tsx          Root layout, fonts, metadata, viewport
  page.tsx            Homepage composition
  globals.css         Tokens, base type, focus rings, reduced-motion
  robots.ts           /robots.txt
  sitemap.ts          /sitemap.xml

components/
  Wordmark.tsx                Text-only wordmark (AOR · copper rule · GREEN)
  InstitutionalHeader.tsx     Top register + primary nav + mobile drawer
  HeroCover.tsx               Institutional cover with tagline + CTAs
  SectionShell.tsx            Shared editorial section frame (numbered, railed)
  ThesisSection.tsx           §01 The Inversion
  CapacitySection.tsx         §02 Operational Capacity (with fact ledger)
  MacroMicroSection.tsx       §03 Dual Scale (macro and micro)
  OperatingArchitecture.tsx   §04 Three modalities + Foundation
  CounterpartySection.tsx     §05 Who We Serve
  EnvironmentalWork.tsx       §06 Environmental Work
  PrinciplesSection.tsx       §07 Non-negotiables (sovereign-green section)
  IdentityRegister.tsx        §08 Identity at a Glance (institutional ledger)
  ContactSection.tsx          §09 Correspondence
  Footer.tsx                  Legal note, offices, languages, copyright

content/
  site.ts             Single source of truth for every line of copy

lib/
  cn.ts               Tiny class-name joiner
```

## Where to edit content

All website copy lives in **`content/site.ts`**. Components do not contain
inline copy. To change a sentence, edit the corresponding key in
`content/site.ts` and the change propagates everywhere.

The same file holds:

- Brand strings and standard phrasings
- Top register (edition, offices, language list)
- Navigation
- Every section's body, intro, and lists
- Identity register rows
- Correspondence addresses
- Footer legal note

When editing, preserve the institutional voice described in the Master Vision
Framework: complete sentences, paragraph-led, no marketing vocabulary, no
exclamation marks, no greenwashing terms.

## Brand and visual rules enforced in code

- The wordmark is text only: `AOR`, copper vertical rule, `GREEN`.
  Implemented in `components/Wordmark.tsx`. There is no symbol, mascot, leaf,
  globe, sprout, or any other decorative mark anywhere in the site.
- "Area of Responsibility : Green" is rendered with spaces around the colon.
- The primary tagline "The arid belt, restored at scale." appears only in
  the hero.
- The five-colour palette (Sovereign Green, Copper, Cream, Ink, Stone) is
  declared once in `tailwind.config.ts` and used everywhere through tokens.
- The dark sovereign-green section is used exactly once, for the
  Non-negotiables section.

## Claim discipline

All numbers and concrete claims are drawn directly from the Master Vision
Framework: 100-hectare Skhira pilot, thirty-five-plus year productive
lifespan, ninety-seven percent retained by farmers after repayment, four
office locations, seven founding shareholders, five operating languages.

Forward-looking concepts are written in language such as "designed to",
"structured to", "intended to", "in establishment", "in incorporation",
"pathway", or "subject to verification". The site does not claim that any
government agreement has been signed, that any verified credit has been
issued or sold, that any bioethanol is currently produced, that any offtake
contract is in place, or that any specific certification has been awarded.

A standing legal note is in the footer:

> Nothing on this website constitutes an offer of securities, investment
> advice, sale of carbon credits, or solicitation in any jurisdiction.

## Accessibility

- Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`,
  `<footer>`, `<dl>`/`<dt>`/`<dd>`, `<ol>`/`<ul>`).
- Single `<h1>` in the hero; `<h2>` per section; `<h3>` for sub-headings.
- Skip-to-content link surfaces on focus.
- Focus rings on every interactive element (`:focus-visible`).
- Mobile navigation is a real button with `aria-expanded`, `aria-controls`,
  and a labelled drawer.
- `prefers-reduced-motion` disables transitions and animations globally.
- Colour contrast is verified against the cream/ink, sovereign/cream, and
  copper/cream pairings.

## SEO and metadata

- `app/layout.tsx` declares title template, description, Open Graph, and
  Twitter card metadata.
- `app/robots.ts` exposes `/robots.txt` referencing the sitemap.
- `app/sitemap.ts` exposes `/sitemap.xml`.
- The full page renders as static HTML (App Router static generation).
- `metadataBase` is set to `https://aorgreen.com`.

## Deployment notes

The site builds to fully static output and can be deployed to any
Next.js-compatible host (Vercel, Netlify, Cloudflare, a Node container,
or a static export with `next export` if absolutely necessary).

Recommended deployment is **Vercel** (zero-config) or any platform that
supports Next.js 14 App Router with native font optimization. Set the
production URL via the `NEXT_PUBLIC_SITE_URL` environment variable in the
hosting environment if you later replace the hardcoded `metadataBase`.

No runtime environment variables are required for the current build.

## Adding future translations

The institution operates in English, Arabic, German, Dutch, and Spanish.
The first build ships English only, and the codebase is structured so that
translations can be added without rewriting components.

Suggested path when adding the second language:

1. Restructure `app/` to use a `[locale]` segment:
   `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`.
2. Move `content/site.ts` to `content/site.en.ts` and add
   `content/site.ar.ts`, `content/site.de.ts`, `content/site.nl.ts`,
   `content/site.es.ts` mirroring the same shape (the exported `Site` type
   in `content/site.ts` constrains the structure).
3. Add a small `getDictionary(locale)` loader and pass the dictionary into
   components instead of importing `site` directly.
4. For Arabic, set `<html lang="ar" dir="rtl">` in the `[locale]` layout
   and the IBM Plex Sans Arabic font (already wired in
   `app/layout.tsx`) takes over for Arabic glyphs.
5. Update `app/sitemap.ts` to emit one URL per locale and use
   `alternates.languages` in the page metadata.

The top register and footer already display the five language labels and
mark `EN` as the active edition.

## Improvements over the previous HTML

- Maintainable component structure separated from content.
- Single source of truth for every line of copy (`content/site.ts`).
- Disciplined claim language; explicit legal disclaimer.
- Real mobile navigation with focus management.
- SEO, Open Graph, sitemap, robots.
- Accessibility: heading order, focus rings, skip link, reduced-motion
  support.
- Multilingual-ready architecture (see above).
- Restrained editorial design: section numbers, rail labels, hairlines,
  ledger-style data blocks, generous whitespace, no card overload, no
  decorative icons, no carousels, no parallax, no scroll-jacking, no
  animated counters.

## Licence

Internal property of AOR Green. Source available to the team and qualified
counterparties.
