import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function ContactSection() {
  const { contact } = site;
  return (
    <SectionShell
      id="correspondence"
      number={contact.sectionNumber}
      rail={contact.rail}
      title={contact.title}
      intro={contact.intro}
      tone="cream-deep"
    >
      <ul className="border-t border-hairline-strong">
        {contact.addresses.map((a) => (
          <li
            key={a.email}
            className="grid grid-cols-12 gap-4 md:gap-8 border-b border-hairline py-6"
          >
            <p className="col-span-12 md:col-span-5 text-base text-ink/80">
              {a.purpose}
            </p>
            <p className="col-span-12 md:col-span-7">
              <a
                href={`mailto:${a.email}`}
                className="font-serif text-xl md:text-2xl text-ink underline decoration-copper decoration-2 underline-offset-[6px] hover:decoration-ink transition-colors"
              >
                {a.email}
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-10 max-w-prose text-base leading-relaxed text-ink/75">
        {contact.closing}
      </p>
    </SectionShell>
  );
}
