import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function IdentityRegister() {
  const { identity } = site;
  return (
    <SectionShell
      id="identity"
      number={identity.sectionNumber}
      rail={identity.rail}
      title={identity.title}
      intro={identity.intro}
    >
      <dl className="border-t border-hairline-strong">
        {identity.rows.map((row) => (
          <div
            key={row.term}
            className="grid grid-cols-12 gap-4 md:gap-8 border-b border-hairline py-5"
          >
            <dt className="col-span-12 md:col-span-4 lg:col-span-3 text-rail uppercase tracking-rail text-stone">
              {row.term}
            </dt>
            <dd className="col-span-12 md:col-span-8 lg:col-span-9 text-base md:text-lg leading-relaxed text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
