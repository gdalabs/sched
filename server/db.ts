import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";

const DATA_DIR = process.env.DATA_DIR || "./data";
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(`${DATA_DIR}/sched.db`);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    admin_token TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS votes (
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    value TEXT NOT NULL CHECK(value IN ('yes','maybe','no')),
    PRIMARY KEY (response_id, candidate_id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
  CREATE INDEX IF NOT EXISTS idx_candidates_event ON candidates(event_id);
  CREATE INDEX IF NOT EXISTS idx_responses_event ON responses(event_id);
`);

export function query<T>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params);
}

export function get<T>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export { db };
