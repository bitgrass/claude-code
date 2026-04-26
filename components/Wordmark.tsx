import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl md:text-4xl",
  xl: "text-5xl md:text-7xl lg:text-8xl",
};

const ruleHeight: Record<Size, string> = {
  sm: "h-4",
  md: "h-5",
  lg: "h-8 md:h-10",
  xl: "h-12 md:h-16 lg:h-20",
};

const ruleWidth: Record<Size, string> = {
  sm: "w-px",
  md: "w-px",
  lg: "w-[2px]",
  xl: "w-[3px]",
};

type Props = {
  size?: Size;
  tone?: "ink" | "sovereign" | "cream";
  className?: string;
  ariaLabel?: string;
};

export function Wordmark({
  size = "md",
  tone = "ink",
  className,
  ariaLabel = "AOR Green",
}: Props) {
  const colorClass =
    tone === "cream"
      ? "text-cream"
      : tone === "sovereign"
        ? "text-sovereign"
        : "text-ink";

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center font-sans font-medium tracking-wordmark",
        sizeClasses[size],
        colorClass,
        className,
      )}
    >
      <span className="leading-none">AOR</span>
      <span
        aria-hidden="true"
        className={cn(
          "mx-3 md:mx-4 inline-block bg-copper",
          ruleHeight[size],
          ruleWidth[size],
        )}
      />
      <span className="leading-none">GREEN</span>
    </span>
  );
}
