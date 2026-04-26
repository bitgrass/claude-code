import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function MacroMicroSection() {
  const { macroMicro } = site;
  return (
    <SectionShell
      id="impact"
      number={macroMicro.sectionNumber}
      rail={macroMicro.rail}
      title={macroMicro.title}
      intro={macroMicro.intro}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-hairline-strong border border-hairline-strong">
        {[macroMicro.macro, macroMicro.micro].map((scale) => (
          <article
            key={scale.label}
            className="bg-cream p-7 md:p-10"
          >
            <header className="flex items-baseline justify-between border-b border-hairline pb-4">
              <p className="text-rail uppercase tracking-rail text-copper">
                {scale.label}
              </p>
              <p className="text-rail uppercase tracking-rail text-stone">
                Scale
              </p>
            </header>
            <h3 className="mt-6 font-serif text-2xl md:text-3xl leading-tight text-ink">
              {scale.heading}
            </h3>
            <ol className="mt-6 flex flex-col">
              {scale.points.map((point, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[2.25rem_1fr] gap-3 py-4 border-t border-hairline first:border-t-0"
                >
                  <span className="text-rail uppercase tracking-rail text-stone-light pt-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-base leading-relaxed text-ink/85">
                    {point}
                  </p>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
