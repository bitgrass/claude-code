-- ═══════════════════════════════════════════════════════════════════
--  QRbase Battle — Full Schema
-- ═══════════════════════════════════════════════════════════════════

-- ── Teams table: the 3 clans ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,          -- 'red' | 'blue' | 'green'
  name        TEXT NOT NULL,             -- 'Scarlet Hawks' etc.
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 3 clans (safe to re-run)
INSERT INTO teams (id, name, emoji) VALUES
  ('red',   'Scarlet Hawks', '🦅'),
  ('blue',  'Cobalt Wolves',  '🐺'),
  ('green', 'Emerald Foxes',  '🦊')
ON CONFLICT (id) DO NOTHING;

-- ── Players (users) table ─────────────────────────────────────────────────────
-- One row per user. PR = wins − losses (can be negative).
CREATE TABLE IF NOT EXISTS players (
  handle       TEXT NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'twitter',  -- 'twitter' | 'farcaster'
  display_name TEXT,
  photo        TEXT,
  team         TEXT REFERENCES teams(id),        -- null until they join a clan
  wins         INTEGER NOT NULL DEFAULT 0,
  losses       INTEGER NOT NULL DEFAULT 0,
  pr           INTEGER NOT NULL DEFAULT 0,       -- always = wins - losses
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (handle, platform)
);

-- ── Battles table: 1v1 room state ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS battles (
  id                 TEXT PRIMARY KEY,
  player1_handle     TEXT NOT NULL,
  player1_platform   TEXT NOT NULL DEFAULT 'twitter',
  player1_name       TEXT,
  player1_photo      TEXT,
  player2_handle     TEXT,
  player2_platform   TEXT,
  player2_name       TEXT,
  player2_photo      TEXT,
  status             TEXT NOT NULL DEFAULT 'waiting',  -- 'waiting' | 'active' | 'done'
  tile_seed          INTEGER NOT NULL,
  started_at         TIMESTAMPTZ,
  player1_solved_ms  INTEGER,
  player2_solved_ms  INTEGER,
  player1_moves      INTEGER NOT NULL DEFAULT 0,
  player2_moves      INTEGER NOT NULL DEFAULT 0,
  player1_board      TEXT,
  player2_board      TEXT,
  winner             TEXT,
  winner_platform    TEXT,
  rematch_room_id    TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Useful views ──────────────────────────────────────────────────────────────
-- Team standings (auto-computed from player PRs)
CREATE OR REPLACE VIEW team_standings AS
  SELECT
    t.id,
    t.name,
    t.emoji,
    COUNT(p.handle)  AS member_count,
    COALESCE(SUM(p.pr), 0) AS total_pr
  FROM teams t
  LEFT JOIN players p ON p.team = t.id
  GROUP BY t.id, t.name, t.emoji
  ORDER BY total_pr DESC;

-- ── Migration helpers (safe to re-run) ───────────────────────────────────────
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_moves     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_moves     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_board     TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_board     TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS rematch_room_id   TEXT;
