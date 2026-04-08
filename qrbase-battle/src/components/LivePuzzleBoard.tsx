"use client";

import type { CSSProperties } from "react";

interface LivePuzzleBoardProps {
  tiles: (number | null)[];
  gradientColors?: [string, string];
}

const GRID = 300;
const TILE = GRID / 3;

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (expanded.length !== 6) return `rgba(34,48,74,${alpha})`;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function tileStyle(tileValue: number, gradientColors: [string, string]): CSSProperties {
  const row = Math.floor(tileValue / 3);
  const col = tileValue % 3;
  const [fromColor, toColor] = gradientColors;
  const offsetX = -col * TILE;
  const offsetY = -row * TILE;
  const pos = `${offsetX}px ${offsetY}px`;
  return {
    backgroundColor: "#0b1022",
    backgroundImage: `linear-gradient(135deg, ${fromColor}, ${toColor})`,
    backgroundSize: `${GRID}px ${GRID}px`,
    backgroundPosition: pos,
    backgroundRepeat: "no-repeat",
    WebkitMaskImage: "url('/grey.svg')",
    maskImage: "url('/grey.svg')",
    WebkitMaskSize: `${GRID}px ${GRID}px`,
    maskSize: `${GRID}px ${GRID}px`,
    WebkitMaskPosition: pos,
    maskPosition: pos,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    width: TILE,
    height: TILE,
  };
}

export function LivePuzzleBoard({ tiles, gradientColors = ["#64748b", "#9ca3af"] }: LivePuzzleBoardProps) {
  const frameColor = withAlpha(gradientColors[0], 0.28);
  const frameColorStrong = withAlpha(gradientColors[1], 0.38);
  const plusColor = withAlpha(gradientColors[1], 0.55);

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg"
      style={{
        width: GRID,
        height: GRID,
        border: `2px solid ${frameColorStrong}`,
        background: "#070d1d",
        display: "grid",
        gridTemplateColumns: `repeat(3, ${TILE}px)`,
        gridTemplateRows: `repeat(3, ${TILE}px)`,
      }}
    >
      {tiles.map((tileValue, slotIndex) => {
        if (tileValue === null) {
          return (
            <div
              key={`empty-${slotIndex}`}
              className="relative flex items-center justify-center"
              style={{
                width: TILE,
                height: TILE,
                border: `1px solid ${frameColor}`,
                background: "rgba(7,13,29,0.98)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <line x1="16" y1="6" x2="16" y2="26" stroke={plusColor} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6" y1="16" x2="26" y2="16" stroke={plusColor} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          );
        }

        const isCorrect = tileValue === slotIndex;

        return (
          <div
            key={`tile-${tileValue}`}
            className="relative select-none"
            style={{
              ...tileStyle(tileValue, gradientColors),
              border: `1px solid ${frameColor}`,
              outline: isCorrect ? "2px solid rgba(16,185,129,0.65)" : undefined,
              outlineOffset: "-2px",
            }}
          />
        );
      })}
    </div>
  );
}
