"use client";

import type { CSSProperties } from "react";

interface LivePuzzleBoardProps {
  tiles: (number | null)[];
  gradientColors?: [string, string];
}

const GRID = 300;
const TILE = GRID / 3;

function tileStyle(tileValue: number, gradientColors: [string, string]): CSSProperties {
  const row = Math.floor(tileValue / 3);
  const col = tileValue % 3;
  const [fromColor, toColor] = gradientColors;
  return {
    backgroundImage: `linear-gradient(135deg, ${fromColor}, ${toColor}), url('/grey.svg')`,
    backgroundBlendMode: "multiply",
    backgroundSize: "300% 300%, 300% 300%",
    backgroundPosition: `${col * 50}% ${row * 50}%, ${col * 50}% ${row * 50}%`,
    width: TILE,
    height: TILE,
  };
}

export function LivePuzzleBoard({ tiles, gradientColors = ["#64748b", "#9ca3af"] }: LivePuzzleBoardProps) {
  return (
    <div
      className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg"
      style={{
        width: GRID,
        height: GRID,
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
              className="relative border border-gray-300 bg-gray-100 flex items-center justify-center"
              style={{ width: TILE, height: TILE }}
            >
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <line x1="16" y1="6" x2="16" y2="26" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6" y1="16" x2="26" y2="16" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          );
        }

        const isCorrect = tileValue === slotIndex;

        return (
          <div
            key={`tile-${tileValue}`}
            className="relative border border-gray-300 select-none"
            style={{
              ...tileStyle(tileValue, gradientColors),
              outline: isCorrect ? "2px solid rgba(16,185,129,0.65)" : undefined,
              outlineOffset: "-2px",
            }}
          />
        );
      })}
    </div>
  );
}
