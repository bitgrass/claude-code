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
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_blur_until TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_blur_until TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_freeze_until TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_freeze_until TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_pending_spell_until TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_pending_spell_until TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_casting_until TIMESTAMPTZ;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_casting_until TIMESTAMPTZ;

-- Live chat messages (global + per-team channels)
CREATE TABLE IF NOT EXISTS chat_messages (
  id           SERIAL PRIMARY KEY,
  channel      TEXT NOT NULL, -- 'global' | 'team'
  team         TEXT REFERENCES teams(id), -- required for channel='team'
  handle       TEXT NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'twitter',
  display_name TEXT,
  photo        TEXT,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_team_created
  ON chat_messages (channel, team, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
  ON chat_messages (channel, created_at DESC);

-- Store items catalog
CREATE TABLE IF NOT EXISTS item_catalog (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL, -- 'spell' | 'shield'
  description   TEXT NOT NULL,
  effect_summary TEXT NOT NULL,
  nft_contract  TEXT,
  nft_token_id  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO item_catalog (id, name, kind, description, effect_summary, nft_contract, nft_token_id) VALUES
  ('spell_frost', 'Frost Hex', 'spell', 'Cast a freezing blur on your opponent''s QR board.', 'After a short cast, freezes and blurs opponent for 3 seconds', '0x5B86DcE926cf950d5ccE2C3a591De433B5F0e8f0', '0'),
  ('shield_guard', 'Aegis Shield', 'shield', 'Cleanse incoming or active Frost Hex effects.', 'Cancels pending spell and removes freeze/blur effects on you', '0x5B86DcE926cf950d5ccE2C3a591De433B5F0e8f0', '1')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  description = EXCLUDED.description,
  effect_summary = EXCLUDED.effect_summary,
  nft_contract = EXCLUDED.nft_contract,
  nft_token_id = EXCLUDED.nft_token_id;

-- User inventory (supports unlimited quantity)
CREATE TABLE IF NOT EXISTS user_items (
  handle      TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'twitter',
  item_id     TEXT NOT NULL REFERENCES item_catalog(id),
  quantity    INTEGER NOT NULL DEFAULT 0,
  used_count  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (handle, platform, item_id)
);

ALTER TABLE user_items ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_items_identity
  ON user_items (handle, platform);

-- One-time on-chain burn proof tracking (prevents tx hash replay).
CREATE TABLE IF NOT EXISTS item_consumptions (
  tx_hash       TEXT PRIMARY KEY,
  handle        TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'twitter',
  item_id       TEXT NOT NULL REFERENCES item_catalog(id),
  wallet_address TEXT NOT NULL,
  used_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_consumptions_identity
  ON item_consumptions (handle, platform, used_at DESC);
