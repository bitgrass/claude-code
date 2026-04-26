import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  id: string;
  number: string;
  rail: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  tone?: "cream" | "sovereign" | "cream-deep";
  className?: string;
};

export function SectionShell({
  id,
  number,
  rail,
  title,
  intro,
  children,
  tone = "cream",
  className,
}: Props) {
  const isDark = tone === "sovereign";
  const bg =
    tone === "sovereign"
      ? "bg-sovereign on-sovereign"
      : tone === "cream-deep"
        ? "bg-cream-deep"
        : "bg-cream";

  const ruleColor = isDark
    ? "bg-cream/25"
    : "bg-[rgba(10,31,28,0.22)]";

  const railColor = isDark ? "text-cream/60" : "text-stone";
  const numberColor = isDark ? "text-cream/40" : "text-stone-light";
  const titleColor = isDark ? "text-cream" : "text-ink";
  const introColor = isDark ? "text-cream/80" : "text-ink/85";

  return (
    <section
      id={id}
      className={cn("scroll-mt-24 px-6 md:px-10 lg:px-16", bg, className)}
    >
      <div className="mx-auto max-w-page py-20 md:py-28 lg:py-36">
        <div className={cn("h-px w-full mb-10 md:mb-14", ruleColor)} />
        <div className="grid grid-cols-12 gap-6 md:gap-10">
          <div className="col-span-12 md:col-span-3 lg:col-span-3">
            <div
              className={cn(
                "flex md:flex-col items-baseline md:items-start gap-4 md:gap-3",
              )}
            >
              <span
                className={cn(
                  "font-mono text-rail uppercase",
                  numberColor,
                )}
              >
                §&nbsp;{number}
              </span>
              <span
                className={cn(
                  "text-rail uppercase tracking-rail",
                  railColor,
                )}
              >
                {rail}
              </span>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9 lg:col-span-9 max-w-narrow">
            <h2
              className={cn(
                "font-serif text-balance text-3xl md:text-[2.5rem] lg:text-[2.75rem] leading-[1.15] tracking-tight",
                titleColor,
              )}
            >
              {title}
            </h2>
            {intro ? (
              <div
                className={cn(
                  "editorial mt-6 md:mt-8 text-lg md:text-xl",
                  introColor,
                )}
              >
                {typeof intro === "string" ? <p>{intro}</p> : intro}
              </div>
            ) : null}
            {children ? <div className="mt-10 md:mt-14">{children}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
