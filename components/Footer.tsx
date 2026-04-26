import { Wordmark } from "@/components/Wordmark";
import { site } from "@/content/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-sovereign-deep text-cream px-6 md:px-10 lg:px-16">
      <div className="mx-auto max-w-page py-16 md:py-20">
        <div className="grid grid-cols-12 gap-8 md:gap-12">
          <div className="col-span-12 md:col-span-5">
            <Wordmark size="lg" tone="cream" />
            <p className="mt-6 text-rail uppercase tracking-rail text-cream/55">
              {site.brand.expansion}
            </p>
            <p className="mt-6 max-w-prose text-base leading-relaxed text-cream/75">
              {site.brand.invitation} {site.brand.geographic}
            </p>
          </div>

          <div className="col-span-6 md:col-span-3">
            <p className="text-rail uppercase tracking-rail text-cream/55">
              Offices
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-cream/85">
              {site.footer.offices.split(" · ").map((o) => (
                <li key={o} className="text-base">
                  {o}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-6 md:col-span-2">
            <p className="text-rail uppercase tracking-rail text-cream/55">
              Languages
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-cream/85">
              {site.topRegister.languages.map((l) => (
                <li key={l} className="text-base">
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 md:col-span-2">
            <p className="text-rail uppercase tracking-rail text-cream/55">
              Correspondence
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {site.contact.addresses.map((a) => (
                <li key={a.email} className="text-sm">
                  <a
                    href={`mailto:${a.email}`}
                    className="text-cream/85 hover:text-cream underline decoration-copper underline-offset-4 decoration-2"
                  >
                    {a.email}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-cream/15 pt-10">
          <p className="max-w-prose text-sm leading-relaxed text-cream/65">
            {site.footer.legal}
          </p>
          <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-rail uppercase tracking-rail text-cream/55">
            <p>
              © {year} · {site.footer.copyright}
            </p>
            <p>
              {site.brand.domain} · {site.topRegister.edition}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
