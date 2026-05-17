// Runtime settings store — admin-configurable integration config that lives in
// the database (so an organisation sets it up in-app, no redeploy / env edit).
// DB settings take precedence over environment-variable defaults.
import db from '../db.js';

const getStmt = db.prepare('SELECT value FROM settings WHERE key=?');
const upStmt = db.prepare(`INSERT INTO settings (key,value,updated_at)
  VALUES (?,?,datetime('now'))
  ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`);

export function getSetting(key, fallback = '') {
  const row = getStmt.get(key);
  return row && row.value != null && row.value !== '' ? row.value : fallback;
}

export function setSetting(key, value) {
  upStmt.run(key, value == null ? '' : String(value));
}
