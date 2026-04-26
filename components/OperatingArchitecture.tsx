import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function OperatingArchitecture() {
  const { architecture } = site;
  return (
    <SectionShell
      id="architecture"
      number={architecture.sectionNumber}
      rail={architecture.rail}
      title={architecture.title}
      intro={architecture.intro}
      tone="cream-deep"
    >
      <ol className="mt-2 divide-y divide-hairline-strong border-y border-hairline-strong">
        {architecture.modalities.map((m) => (
          <li
            key={m.number}
            className="grid grid-cols-12 gap-6 md:gap-10 py-8 md:py-10"
          >
            <div className="col-span-12 md:col-span-2">
              <p className="font-serif text-3xl md:text-4xl text-copper leading-none">
                {m.number}
              </p>
            </div>
            <div className="col-span-12 md:col-span-10">
              <h3 className="font-serif text-xl md:text-2xl text-ink leading-tight">
                {m.name}
              </h3>
              <p className="mt-3 max-w-prose text-base md:text-lg leading-relaxed text-ink/80">
                {m.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
