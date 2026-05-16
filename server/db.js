import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(join(__dirname, 'atomberg.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee','manager','admin')),
  manager_id INTEGER REFERENCES users(id),
  department TEXT,
  title TEXT
);

CREATE TABLE IF NOT EXISTS cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  fy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  goal_window_open TEXT,
  q1_open TEXT, q2_open TEXT, q3_open TEXT, q4_open TEXT
);

CREATE TABLE IF NOT EXISTS thrust_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS goal_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  cycle_id INTEGER NOT NULL REFERENCES cycles(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','returned')),
  locked INTEGER NOT NULL DEFAULT 0,
  return_comment TEXT,
  submitted_at TEXT,
  approved_at TEXT,
  UNIQUE(employee_id, cycle_id)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id INTEGER NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
  thrust_area_id INTEGER NOT NULL REFERENCES thrust_areas(id),
  title TEXT NOT NULL,
  description TEXT,
  uom_type TEXT NOT NULL
    CHECK (uom_type IN ('numeric_min','numeric_max','percent','timeline','zero')),
  target REAL,
  target_date TEXT,
  weightage REAL NOT NULL,
  shared_origin_id INTEGER REFERENCES goals(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  actual_value REAL,
  completion_date TEXT,
  status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (status IN ('Not Started','On Track','Completed')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(goal_id, quarter)
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id INTEGER NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  manager_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(sheet_id, quarter)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule TEXT NOT NULL,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  detail TEXT,
  level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// node:sqlite has no .transaction(); provide a simple wrapper.
export function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export default db;
