import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export type BattleStatus = "waiting" | "active" | "done";
export type Platform = "twitter" | "farcaster";
export type Team = "red" | "blue" | "green";

export interface BattleRow {
  id: string;
  player1_handle: string;
  player1_platform: Platform;
  player1_name: string | null;
  player1_photo: string | null;
  player2_handle: string | null;
  player2_platform: Platform | null;
  player2_name: string | null;
  player2_photo: string | null;
  status: BattleStatus;
  tile_seed: number;
  started_at: string | null;
  player1_solved_ms: number | null;
  player2_solved_ms: number | null;
  player1_moves: number;
  player2_moves: number;
  player1_board: string | null;
  player2_board: string | null;
  winner: string | null;
  winner_platform: Platform | null;
  rematch_room_id: string | null;
  created_at: string;
}

export interface PlayerRow {
  handle: string;
  platform: Platform;
  display_name: string | null;
  photo: string | null;
  team: Team | null;
  wins: number;
  losses: number;
  pr: number;
  created_at: string;
  updated_at: string;
}
