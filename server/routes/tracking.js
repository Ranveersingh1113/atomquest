import { Router } from 'express';
import db, { tx } from '../db.js';
import { requireAuth } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { getSheetDetail, getActiveCycle, openQuarters } from '../lib/sheets.js';

const r = Router();
r.use(requireAuth);

function upsertAchievement(goalId, quarter, fields) {
  const existing = db.prepare('SELECT * FROM achievements WHERE goal_id=? AND quarter=?')
    .get(goalId, quarter);
  if (existing) {
    db.prepare(`UPDATE achievements SET actual_value=?,completion_date=?,status=?,
                updated_at=datetime('now') WHERE id=?`)
      .run(fields.actual_value, fields.completion_date, fields.status, existing.id);
  } else {
    db.prepare(`INSERT INTO achievements (goal_id,quarter,actual_value,completion_date,status)
                VALUES (?,?,?,?,?)`)
      .run(goalId, quarter, fields.actual_value, fields.completion_date, fields.status);
  }
}

// --- Log quarterly achievement against a goal ---
r.put('/goals/:id/achievement', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id=?').get(Number(req.params.id));
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(goal.sheet_id);

  if (sheet.employee_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'You can only update your own achievements' });
  if (sheet.status !== 'approved')
    return res.status(400).json({ error: 'Achievements can only be logged on approved goal sheets' });
  if (goal.shared_origin_id)
    return res.status(400).json({ error: 'Shared goal — achievement is synced from the primary owner' });

  const { quarter } = req.body || {};
  const cycle = getActiveCycle();
  if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter))
    return res.status(400).json({ error: 'Invalid quarter' });
  if (!openQuarters(cycle).includes(quarter) && req.user.role !== 'admin')
    return res.status(400).json({ error: `${quarter} check-in window is not open yet` });

  const status = req.body.status || 'Not Started';
  if (!['Not Started', 'On Track', 'Completed'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  const actual = req.body.actual_value === '' || req.body.actual_value == null
    ? null : Number(req.body.actual_value);
  const completionDate = req.body.completion_date || null;
  const fields = { actual_value: actual, completion_date: completionDate, status };

  tx(() => {
    upsertAchievement(goal.id, quarter, fields);
    audit('achievement', goal.id, req.user.id,
      sheet.locked ? 'achievement updated (locked sheet)' : 'achievement updated',
      quarter, null, `${status} / ${actual ?? '-'}`);
    // Sync to all linked shared copies
    const copies = db.prepare('SELECT id FROM goals WHERE shared_origin_id=?').all(goal.id);
    for (const c of copies) {
      upsertAchievement(c.id, quarter, fields);
      audit('achievement', c.id, req.user.id, 'synced from shared origin', quarter, null, status);
    }
  });
  res.json(getSheetDetail(sheet.id));
});

// --- Manager check-in comment for a team member's sheet ---
r.post('/checkins', (req, res) => {
  const { sheet_id, quarter, comment } = req.body || {};
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(Number(sheet_id));
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  const emp = db.prepare('SELECT manager_id FROM users WHERE id=?').get(sheet.employee_id);
  if (!((req.user.role === 'manager' && emp.manager_id === req.user.id) || req.user.role === 'admin'))
    return res.status(403).json({ error: 'Only the reporting manager can record a check-in' });
  if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter))
    return res.status(400).json({ error: 'Invalid quarter' });
  if (!(comment || '').trim())
    return res.status(400).json({ error: 'Check-in comment is required' });

  const existing = db.prepare('SELECT id FROM checkins WHERE sheet_id=? AND quarter=?')
    .get(sheet.id, quarter);
  if (existing)
    db.prepare("UPDATE checkins SET comment=?,manager_id=?,created_at=datetime('now') WHERE id=?")
      .run(comment.trim(), req.user.id, existing.id);
  else
    db.prepare('INSERT INTO checkins (sheet_id,quarter,manager_id,comment) VALUES (?,?,?,?)')
      .run(sheet.id, quarter, req.user.id, comment.trim());
  audit('checkin', sheet.id, req.user.id, 'check-in recorded', quarter, null, comment.trim());
  res.json(getSheetDetail(sheet.id));
});

export default r;
