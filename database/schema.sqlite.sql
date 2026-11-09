-- Esquema para SQLite (modo local por defecto). Equivalente a schema.sqlserver.sql.
CREATE TABLE IF NOT EXISTS members (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  program_id   TEXT NOT NULL,
  joined_at    TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (member_id, program_id)
);

CREATE TABLE IF NOT EXISTS step_progress (
  member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  program_id   TEXT NOT NULL,
  step_id      TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (member_id, step_id)
);

CREATE TABLE IF NOT EXISTS member_badges (
  member_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  badge_id   TEXT NOT NULL,
  program_id TEXT NOT NULL,
  awarded_at TEXT NOT NULL,
  PRIMARY KEY (member_id, badge_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  topic      TEXT,
  question   TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  choice      TEXT NOT NULL,
  is_correct  INTEGER NOT NULL,
  answered_at TEXT NOT NULL,
  PRIMARY KEY (member_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS member_settings (
  member_id   INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  weekly_goal INTEGER NOT NULL DEFAULT 5,
  focus_area  TEXT
);
