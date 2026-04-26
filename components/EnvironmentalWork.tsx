import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function EnvironmentalWork() {
  const { environment } = site;
  return (
    <SectionShell
      id="environment"
      number={environment.sectionNumber}
      rail={environment.rail}
      title={environment.title}
      tone="cream-deep"
    >
      <ol className="border-y border-hairline-strong divide-y divide-hairline">
        {environment.items.map((item, i) => (
          <li
            key={item.heading}
            className="grid grid-cols-12 gap-6 md:gap-10 py-8 md:py-10"
          >
            <div className="col-span-12 md:col-span-1">
              <span className="font-mono text-rail uppercase text-stone-light">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="col-span-12 md:col-span-4">
              <h3 className="font-serif text-xl md:text-2xl text-ink leading-tight">
                {item.heading}
              </h3>
            </div>
            <div className="col-span-12 md:col-span-7">
              <p className="max-w-prose text-base md:text-lg leading-relaxed text-ink/80">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
