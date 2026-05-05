export type Team = "red" | "blue" | "green";

export type BattlePhase =
  | "lobby"
  | "countdown"
  | "playing"
  | "result";

export interface BattleStats {
  wins: number;
  losses: number;
  pr: number;
  team: Team | null;
}

export interface BattleResult {
  won: boolean;
  solveTimeMs: number | null; // null = timeout
  opponentTimeMs: number | null;
  prDelta: number;
}

export const TEAMS: Record<Team, { label: string; color: string; bg: string; border: string; text: string }> = {
  red: {
    label: "Purple Team",
    color: "#8B5CF6",
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-600",
  },
  blue: {
    label: "Blue Team",
    color: "#3B82F6",
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-600",
  },
  green: {
    label: "Green Team",
    color: "#10B981",
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-600",
  },
};
