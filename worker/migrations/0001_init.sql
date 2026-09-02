-- Accounts, friends, leaderboards, and backup — see the plan for the full design
-- rationale (normalized tables only where leaderboards need to query; everything
-- else lives in the opaque `backups` blob).

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  recovery_code_hash TEXT NOT NULL,
  avatar_type TEXT NOT NULL DEFAULT 'preset',
  avatar_value TEXT NOT NULL DEFAULT 'default',
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

-- One row per friendship (not two), keyed by a canonical (user_a < user_b) ordering
-- enforced by the application layer when inserting.
CREATE TABLE friendships (
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE INDEX idx_friendships_user_b ON friendships(user_b);

-- elapsed_ms is used by every game except Wordle, which scores by `guesses` (1-6 —
-- the Daily Challenge lets a player keep retrying the same word after a loss until
-- they win it, so a synced score is always a winning guess count, never a loss).
-- Exactly one of the two is set, decided by game_id.
CREATE TABLE daily_scores (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  elapsed_ms INTEGER,
  guesses INTEGER,
  assisted INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, game_id, date_key)
);

CREATE INDEX idx_daily_scores_lookup ON daily_scores(game_id, date_key);

-- Mirrors storage/db.ts's DifficultyProgress. The API only ever raises
-- completed_count/best_time_ms on write (never trusts a client-sent decrease).
CREATE TABLE game_stats (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  best_time_ms INTEGER,
  total_time_ms INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, game_id, difficulty)
);

-- One opaque JSON blob per user: settings, cosmetics, achievements-seen,
-- in-progress boards, full daily-challenge history — everything that doesn't need
-- cross-user querying. This is the full-fidelity backup/restore payload.
CREATE TABLE backups (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Per-IP signup rate limiting — stray bot signups, not quota pressure.
CREATE TABLE signup_attempts (
  ip TEXT NOT NULL,
  date_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, date_key)
);
