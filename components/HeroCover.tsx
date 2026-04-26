import { Wordmark } from "@/components/Wordmark";
import { site } from "@/content/site";

export function HeroCover() {
  const { hero, brand } = site;

  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative px-6 md:px-10 lg:px-16 pt-12 md:pt-20 lg:pt-28 pb-20 md:pb-28 lg:pb-36"
    >
      <div className="mx-auto max-w-page">
        {/* Cover register */}
        <div className="grid grid-cols-12 gap-6 md:gap-10 mb-10 md:mb-16">
          <div className="col-span-12 md:col-span-3">
            <p className="text-rail uppercase tracking-rail text-stone">
              Institutional Cover
            </p>
          </div>
          <div className="col-span-12 md:col-span-9">
            <p className="text-rail uppercase tracking-rail text-stone">
              {brand.expansion}
            </p>
          </div>
        </div>

        <div className="rule mb-12 md:mb-16" />

        {/* Wordmark */}
        <div className="animate-fade-up">
          <Wordmark
            size="xl"
            tone="ink"
            ariaLabel="AOR Green"
            className="block"
          />
        </div>

        {/* Tagline */}
        <h1
          id="hero-heading"
          className="mt-10 md:mt-16 max-w-narrow font-serif text-balance text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-ink"
        >
          {hero.tagline}
        </h1>

        {/* Body */}
        <div className="grid grid-cols-12 gap-6 md:gap-10 mt-12 md:mt-16">
          <div className="col-span-12 md:col-span-3 lg:col-span-3">
            <p className="text-rail uppercase tracking-rail text-stone">
              Statement
            </p>
          </div>
          <div className="col-span-12 md:col-span-9 lg:col-span-8 editorial">
            <p className="text-lg md:text-xl text-ink/85">{hero.paragraph}</p>
            <p className="text-base md:text-lg text-ink/75 mt-5">
              {hero.secondaryParagraph}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href={hero.primaryCta.href}
                className="inline-flex items-center justify-center bg-sovereign text-cream px-6 py-3.5 text-base hover:bg-sovereign-deep transition-colors"
              >
                {hero.primaryCta.label}
                <span aria-hidden="true" className="ml-3">
                  →
                </span>
              </a>
              <a
                href={hero.secondaryCta.href}
                className="inline-flex items-center justify-center border border-ink/20 px-6 py-3.5 text-base text-ink hover:border-ink/60 transition-colors"
              >
                {hero.secondaryCta.label}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom register */}
        <div className="grid grid-cols-12 gap-6 md:gap-10 mt-20 md:mt-28">
          <div className="col-span-12 md:col-span-3">
            <p className="text-rail uppercase tracking-rail text-stone">
              Offices
            </p>
            <p className="mt-2 text-sm text-ink/80">
              {site.topRegister.offices}
            </p>
          </div>
          <div className="col-span-12 md:col-span-3">
            <p className="text-rail uppercase tracking-rail text-stone">
              Operating languages
            </p>
            <p className="mt-2 text-sm text-ink/80">
              English, Arabic, German, Dutch, Spanish
            </p>
          </div>
          <div className="col-span-12 md:col-span-3">
            <p className="text-rail uppercase tracking-rail text-stone">
              Self-description
            </p>
            <p className="mt-2 text-sm text-ink/80">{brand.selfDescription}</p>
          </div>
          <div className="col-span-12 md:col-span-3">
            <p className="text-rail uppercase tracking-rail text-stone">
              Engagement
            </p>
            <p className="mt-2 text-sm text-ink/80">{brand.invitation}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
