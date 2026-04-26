import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function CapacitySection() {
  const { capacity } = site;
  return (
    <SectionShell
      id="capacity"
      number={capacity.sectionNumber}
      rail={capacity.rail}
      title={capacity.title}
      tone="cream-deep"
    >
      <div className="editorial max-w-prose text-ink/85">
        {capacity.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <dl className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-hairline-strong">
        {capacity.facts.map((fact) => (
          <div
            key={fact.term}
            className="py-6 sm:py-8 sm:border-r sm:last:border-r-0 border-hairline sm:pr-6 sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(4n)]:border-r-0"
          >
            <dt className="text-rail uppercase tracking-rail text-stone">
              {fact.term}
            </dt>
            <dd className="mt-3 font-serif text-2xl leading-tight text-ink">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
