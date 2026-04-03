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

function tileStyle(tileValue: number, gradientColors: [string, string]): React.CSSProperties {
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
      <div className="flex items-center gap-3 px-5 py-2 rounded-full border border-gray-300 bg-white shadow-sm">
        <span className="text-sm font-semibold text-gray-500">Moves</span>
        <span className="text-xl font-black text-gray-900 tabular-nums">{moves}</span>
      </div>

      {/* Puzzle grid — matches reference: w-[360px] border-2 border-gray-300 rounded-lg grid-cols-3 */}
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
          const isAdjacent = tileValue !== null && canSlide(slotIndex, emptySlot);
          const isCorrect = tileValue !== null && tileValue === slotIndex;

          if (tileValue === null) {
            return (
              <div
                key="empty"
                className="relative border border-gray-300 bg-gray-100 flex items-center justify-center"
                style={{ width: TILE, height: TILE }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <line x1="16" y1="6" x2="16" y2="26" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="6" y1="16" x2="26" y2="16" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            );
          }

          return (
            <div
              key={tileValue}
              onClick={() => handleClick(slotIndex)}
              className={[
                "relative border border-gray-300 group select-none",
                isAdjacent && !disabled
                  ? "cursor-pointer"
                  : "cursor-default",
              ].join(" ")}
              style={{
                ...tileStyle(tileValue, gradientColors),
                outline: isCorrect ? "2px solid rgba(16,185,129,0.65)" : undefined,
                outlineOffset: "-2px",
              }}
            >
              {/* Hover overlay for adjacent tiles */}
              {isAdjacent && !disabled && (
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
