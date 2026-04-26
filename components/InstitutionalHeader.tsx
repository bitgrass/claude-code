"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

export function InstitutionalHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40">
      {/* Top register */}
      <div
        className={cn(
          "border-b border-hairline bg-cream/95 backdrop-blur-sm",
          "transition-colors",
        )}
      >
        <div className="mx-auto flex max-w-page items-center justify-between gap-6 px-6 py-2 md:px-10 lg:px-16">
          <p className="text-rail uppercase tracking-rail text-stone">
            {site.topRegister.edition}
          </p>
          <p className="hidden md:block text-rail uppercase tracking-rail text-stone">
            {site.topRegister.offices}
          </p>
          <ul
            className="flex items-center gap-3 text-rail uppercase tracking-rail text-stone"
            aria-label="Languages (English shown; further languages forthcoming)"
          >
            {site.topRegister.languages.map((lang, i) => (
              <li key={lang} className="flex items-center gap-3">
                <span
                  aria-current={lang === "EN" ? "true" : undefined}
                  className={cn(
                    lang === "EN" ? "text-ink" : "text-stone-light",
                  )}
                >
                  {lang}
                </span>
                {i < site.topRegister.languages.length - 1 ? (
                  <span aria-hidden="true" className="text-stone-light">
                    ·
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Primary navigation */}
      <div
        className={cn(
          "bg-cream/95 backdrop-blur-sm transition-shadow",
          scrolled ? "shadow-[0_1px_0_0_rgba(10,31,28,0.10)]" : "",
        )}
      >
        <div className="mx-auto flex max-w-page items-center justify-between gap-8 px-6 py-4 md:px-10 lg:px-16">
          <Link
            href="#top"
            className="group inline-flex items-center"
            aria-label="AOR Green — home"
          >
            <Wordmark size="md" tone="ink" />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-7"
          >
            {site.navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm tracking-tight text-ink/80 hover:text-ink transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:block">
            <a
              href="#correspondence"
              className="inline-flex items-center gap-2 border border-ink/20 px-4 py-2 text-sm text-ink hover:bg-ink hover:text-cream transition-colors"
            >
              Correspondence
            </a>
          </div>

          <button
            type="button"
            className="lg:hidden inline-flex flex-col items-end gap-1.5 px-2 py-2"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={cn(
                "block h-px w-7 bg-ink transition-transform",
                open ? "translate-y-[7px] rotate-45" : "",
              )}
            />
            <span
              className={cn(
                "block h-px w-5 bg-ink transition-opacity",
                open ? "opacity-0" : "opacity-100",
              )}
            />
            <span
              className={cn(
                "block h-px w-7 bg-ink transition-transform",
                open ? "-translate-y-[7px] -rotate-45" : "",
              )}
            />
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        id="mobile-nav"
        className={cn(
          "lg:hidden fixed inset-x-0 top-[88px] bottom-0 bg-cream border-t border-hairline overflow-y-auto transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <nav aria-label="Mobile" className="px-6 py-8">
          <ul className="flex flex-col gap-1">
            {site.navigation.map((item, i) => (
              <li
                key={item.href}
                className="border-b border-hairline last:border-b-0"
              >
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline justify-between py-4 text-2xl font-serif text-ink"
                >
                  <span>{item.label}</span>
                  <span className="text-rail uppercase tracking-rail text-stone-light">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#correspondence"
            onClick={() => setOpen(false)}
            className="mt-10 inline-flex items-center justify-center w-full border border-ink/20 px-5 py-4 text-base text-ink"
          >
            Correspondence
          </a>
        </nav>
      </div>
    </header>
  );
}
