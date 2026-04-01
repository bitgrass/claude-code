"use client";

import { useEffect, useRef, useState } from "react";

const SIZES = {
  sm: "w-40",
  md: "w-72",
  lg: "w-[480px]",
};

// Teal colors in the original SVG → brand colors
const COLOR_MAP: [RegExp, string][] = [
  [/#80d4ce/gi, "#60A5FA"],   // light teal  → light blue
  [/#90dad8/gi, "#93C5FD"],   // lighter teal → lighter blue
  [/#578faa/gi, "#0052FF"],   // mid teal     → primary blue
  [/#4f829d/gi, "#7C3AED"],   // dark teal    → brand purple
];

// All paths that belong to the eye (iris + highlights)
const EYE_PATH_IDS = ["path23", "path25", "path31", "path40", "path42"];

interface Props {
  size?: "sm" | "md" | "lg";
  badges?: boolean;
}

export function RobotMascot({ size = "md" }: Props) {
  const containerRef              = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [blink, setBlink]          = useState(false);
  const eyeRef                     = useRef({ x: 0, y: 0 });

  /* ── fetch + recolor SVG once ── */
  useEffect(() => {
    fetch("/Robot.svg")
      .then((r) => r.text())
      .then((raw) => {
        let svg = raw
          .replace(/width="2933\.3333"/,  'width="100%"')
          .replace(/height="2933\.3333"/, 'height="100%"');
        COLOR_MAP.forEach(([pattern, color]) => { svg = svg.replace(pattern, color); });
        setSvgContent(svg);
      });
  }, []);

  /* ── mouse tracking — update DOM directly (no re-render) ── */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2);
      const dy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      eyeRef.current = {
        x: Math.max(-18, Math.min(18, dx * 18)),
        y: Math.max(-12, Math.min(12, dy * 12)),
      };
      if (!containerRef.current) return;
      const translate = `translate(${eyeRef.current.x}px, ${eyeRef.current.y}px)`;
      EYE_PATH_IDS.forEach((id) => {
        const el = containerRef.current!.querySelector(`#${id}`) as SVGElement | null;
        if (el) {
          el.style.transform  = translate;
          el.style.transition = "transform 0.02s linear";
        }
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* ── random blink: briefly hide eye paths ── */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => { setBlink(false); loop(); }, 140);
      }, Math.random() * 3500 + 1800);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  /* ── apply blink via DOM opacity ── */
  useEffect(() => {
    if (!containerRef.current) return;
    EYE_PATH_IDS.forEach((id) => {
      const el = containerRef.current!.querySelector(`#${id}`) as SVGElement | null;
      if (el) el.style.opacity = blink ? "0" : "1";
    });
  }, [blink]);

  return (
    <div className={`relative ${SIZES[size]} aspect-square select-none`}>
      <div className="w-full h-full animate-float" ref={containerRef}>
        {svgContent ? (
          <div
            className="w-full h-full drop-shadow-2xl"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          /* skeleton while loading */
          <div className="w-full h-full rounded-3xl bg-surface-muted animate-pulse" />
        )}
      </div>
    </div>
  );
}
