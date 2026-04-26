import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function PrinciplesSection() {
  const { principles } = site;
  return (
    <SectionShell
      id="principles"
      number={principles.sectionNumber}
      rail={principles.rail}
      title={principles.title}
      intro={principles.intro}
      tone="sovereign"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12">
        <div className="md:col-span-5">
          <ul className="border-t border-cream/25">
            {principles.register.map((line) => (
              <li
                key={line}
                className="border-b border-cream/25 py-5 font-serif text-2xl md:text-[1.75rem] text-cream leading-tight"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-7">
          <ol className="divide-y divide-cream/15 border-y border-cream/25">
            {principles.items.map((p, i) => (
              <li key={p.heading} className="py-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-rail uppercase text-cream/45">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-lg md:text-xl text-cream">
                    {p.heading}
                  </h3>
                </div>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-cream/80">
                  {p.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </SectionShell>
  );
}
