"use client";

import { useState, useCallback } from "react";
import { canSlide, isSlidingSolved } from "@/lib/battle-utils";

interface QRPuzzleProps {
  initialTiles: (number | null)[];
  onSolve: (timeMs: number, moves: number) => void;
  startTime: number;
  disabled?: boolean;
  onMove?: (moves: number, board: (number | null)[]) => void;
  gradientColors?: [string, string];
}

// Reference app uses 440×440 grid — we match that
const GRID = 360;
const TILE = GRID / 3; // 120px per tile

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

function tileStyle(tileValue: number, gradientColors: [string, string]): React.CSSProperties {
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

export function QRPuzzle({
  initialTiles,
  onSolve,
  startTime,
  disabled,
  onMove,
  gradientColors = ["#64748b", "#9ca3af"],
}: QRPuzzleProps) {
  const [tiles, setTiles] = useState<(number | null)[]>(initialTiles);
  const [moves, setMoves] = useState(0);
  const frameColor = withAlpha(gradientColors[0], 0.28);
  const frameColorStrong = withAlpha(gradientColors[1], 0.38);
  const plusColor = withAlpha(gradientColors[1], 0.55);

  const emptySlot = tiles.indexOf(null);

  const handleClick = useCallback(
    (slotIndex: number) => {
      if (disabled) return;
      if (tiles[slotIndex] === null) return;

      const empty = tiles.indexOf(null);
      if (!canSlide(slotIndex, empty)) return;

      const next = [...tiles];
      next[empty] = next[slotIndex];
      next[slotIndex] = null;

      const newMoves = moves + 1;
      setTiles(next);
      setMoves(newMoves);
      onMove?.(newMoves, next);

      if (isSlidingSolved(next)) {
        onSolve(Date.now() - startTime, newMoves);
      }
    },
    [disabled, tiles, moves, onSolve, startTime, onMove]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Moves badge — matches reference style */}
      <div
        className="flex items-center gap-3 px-5 py-2 rounded-full shadow-sm"
        style={{
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(8,12,26,0.9)",
        }}
      >
        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>Moves</span>
        <span className="text-xl font-black tabular-nums" style={{ color: "#fff" }}>{moves}</span>
      </div>

      {/* Puzzle grid — matches reference: w-[360px] border-2 border-gray-300 rounded-lg grid-cols-3 */}
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
          const isAdjacent = tileValue !== null && canSlide(slotIndex, emptySlot);
          const isCorrect = tileValue !== null && tileValue === slotIndex;

          if (tileValue === null) {
            return (
              <div
                key="empty"
                className="relative flex items-center justify-center"
                style={{
                  width: TILE,
                  height: TILE,
                  border: `1px solid ${frameColor}`,
                  background: "rgba(7,13,29,0.98)",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <line x1="16" y1="6" x2="16" y2="26" stroke={plusColor} strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="6" y1="16" x2="26" y2="16" stroke={plusColor} strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            );
          }

          return (
            <div
              key={tileValue}
              onClick={() => handleClick(slotIndex)}
              className={[
                "relative group select-none",
                isAdjacent && !disabled
                  ? "cursor-pointer"
                  : "cursor-default",
              ].join(" ")}
              style={{
                ...tileStyle(tileValue, gradientColors),
                border: `1px solid ${frameColor}`,
                outline: isCorrect ? "2px solid rgba(16,185,129,0.65)" : undefined,
                outlineOffset: "-2px",
              }}
            >
              {/* Hover overlay for adjacent tiles */}
              {isAdjacent && !disabled && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100"
                  style={{ background: "rgba(16,185,129,0.16)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
