import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function CounterpartySection() {
  const { counterparties } = site;
  return (
    <SectionShell
      id="counterparties"
      number={counterparties.sectionNumber}
      rail={counterparties.rail}
      title={counterparties.title}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
        {counterparties.items.map((item, i) => (
          <article
            key={item.name}
            className="border-t border-hairline-strong pt-6"
          >
            <header className="flex items-baseline justify-between">
              <h3 className="font-serif text-2xl md:text-[1.75rem] text-ink leading-tight">
                {item.name}
              </h3>
              <span className="text-rail uppercase tracking-rail text-stone-light">
                {String(i + 1).padStart(2, "0")} / {counterparties.items.length.toString().padStart(2, "0")}
              </span>
            </header>
            <p className="mt-4 max-w-prose text-base leading-relaxed text-ink/80">
              {item.body}
            </p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
