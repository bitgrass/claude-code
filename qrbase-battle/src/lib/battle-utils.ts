// ── Room code ────────────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 ambiguity

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// ── Sliding 8-puzzle helpers ─────────────────────────────────────────────────
// Solved state: [0,1,2,3,4,5,6,7,null] — null is the empty slot
function countInversions(nums: number[]): number {
  let inv = 0;
  for (let i = 0; i < nums.length - 1; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] > nums[j]) inv++;
  return inv;
}

export function seededShuffle(seed: number): (number | null)[] {
  const arr: (number | null)[] = [0, 1, 2, 3, 4, 5, 6, 7, null];
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // 8-puzzle solvable iff inversion count is even
  const nums = arr.filter((t) => t !== null) as number[];
  if (countInversions(nums) % 2 !== 0) {
    // swap first two non-null tiles to fix parity
    const i0 = arr.findIndex((t) => t !== null);
    const i1 = arr.findIndex((t, i) => i > i0 && t !== null);
    [arr[i0], arr[i1]] = [arr[i1], arr[i0]];
  }
  // Re-shuffle if accidentally already solved
  if (arr.every((v, i) => (i === 8 ? v === null : v === i))) return seededShuffle(seed + 1);
  return arr;
}

export function canSlide(tileSlot: number, emptySlot: number): boolean {
  const tr = Math.floor(tileSlot / 3), tc = tileSlot % 3;
  const er = Math.floor(emptySlot / 3), ec = emptySlot % 3;
  return (tr === er && Math.abs(tc - ec) === 1) || (tc === ec && Math.abs(tr - er) === 1);
}

export function isSlidingSolved(tiles: (number | null)[]): boolean {
  return tiles.every((v, i) => (i === 8 ? v === null : v === i));
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000);
}

export type PuzzleBoard = (number | null)[];

export function isValidPuzzleBoard(board: unknown): board is PuzzleBoard {
  if (!Array.isArray(board) || board.length !== 9) return false;

  let nullCount = 0;
  const seen = new Set<number>();

  for (const cell of board) {
    if (cell === null) {
      nullCount++;
      continue;
    }
    if (!Number.isInteger(cell) || cell < 0 || cell > 7 || seen.has(cell)) return false;
    seen.add(cell);
  }

  return nullCount === 1 && seen.size === 8;
}

export function parsePuzzleBoard(raw: string | null | undefined): PuzzleBoard | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isValidPuzzleBoard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializePuzzleBoard(board: PuzzleBoard): string {
  return JSON.stringify(board);
}

// ── PR calculation — PR = wins − losses ──────────────────────────────────────
export function calcPR(won: boolean): number {
  return won ? 1 : -1;
}

export function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
