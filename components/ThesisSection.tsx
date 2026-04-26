import { SectionShell } from "@/components/SectionShell";
import { site } from "@/content/site";

export function ThesisSection() {
  const { thesis } = site;
  return (
    <SectionShell
      id="thesis"
      number={thesis.sectionNumber}
      rail={thesis.rail}
      title={thesis.title}
    >
      <div className="editorial max-w-prose text-ink/85">
        {thesis.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </SectionShell>
  );
}
