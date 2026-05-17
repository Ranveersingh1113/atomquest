import { Router } from 'express';
import db, { tx } from '../db.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { getSheetDetail, getActiveCycle, QUARTERS } from '../lib/sheets.js';
import { onGoalSubmitted, onGoalApproved, onGoalReturned } from '../lib/notify.js';

const r = Router();
r.use(requireAuth);

const MAX_GOALS = 8, MIN_WEIGHTAGE = 10;

function getOrCreateMySheet(userId) {
  const cycle = getActiveCycle();
  let sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id=? AND cycle_id=?')
    .get(userId, cycle.id);
  if (!sheet) {
    const id = db.prepare('INSERT INTO goal_sheets (employee_id,cycle_id,status) VALUES (?,?,?)')
      .run(userId, cycle.id, 'draft').lastInsertRowid;
    sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(id);
  }
  return sheet;
}

// Can the given user view this sheet? owner, owner's manager, or admin.
function canView(user, sheet) {
  if (user.role === 'admin') return true;
  if (user.id === sheet.employee_id) return true;
  const emp = db.prepare('SELECT manager_id FROM users WHERE id=?').get(sheet.employee_id);
  return user.role === 'manager' && emp.manager_id === user.id;
}

// --- My sheet for the active cycle ---
r.get('/sheets/mine', (req, res) => {
  const sheet = getOrCreateMySheet(req.user.id);
  res.json(getSheetDetail(sheet.id));
});

// --- Sheet detail ---
r.get('/sheets/:id', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(Number(req.params.id));
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (!canView(req.user, sheet)) return res.status(403).json({ error: 'Forbidden' });
  res.json(getSheetDetail(sheet.id));
});

// --- All sheets visible to me (admin: all, manager: team) ---
r.get('/sheets', (req, res) => {
  let rows;
  if (req.user.role === 'admin')
    rows = db.prepare(`SELECT gs.id FROM goal_sheets gs ORDER BY gs.id`).all();
  else if (req.user.role === 'manager')
    rows = db.prepare(`SELECT gs.id FROM goal_sheets gs JOIN users u ON u.id=gs.employee_id
                       WHERE u.manager_id=? ORDER BY gs.id`).all(req.user.id);
  else
    rows = db.prepare('SELECT id FROM goal_sheets WHERE employee_id=?').all(req.user.id);
  res.json(rows.map(x => getSheetDetail(x.id)));
});

function validateGoalInput(g) {
  if (!g.title || !g.title.trim()) return 'Goal title is required';
  if (!g.thrust_area_id) return 'Thrust area is required';
  if (!['numeric_min', 'numeric_max', 'percent', 'timeline', 'zero'].includes(g.uom_type))
    return 'Invalid Unit of Measurement';
  const w = Number(g.weightage);
  if (!Number.isFinite(w) || w < MIN_WEIGHTAGE)
    return `Minimum weightage per goal is ${MIN_WEIGHTAGE}%`;
  if (w > 100) return 'Weightage cannot exceed 100%';
  if (g.uom_type === 'timeline') {
    if (!g.target_date) return 'Timeline goals require a target date';
  } else if (g.uom_type !== 'zero') {
    if (g.target == null || g.target === '') return 'Target value is required';
    if (!Number.isFinite(Number(g.target))) return 'Target must be a numeric value';
  }
  return null;
}

// --- Add a goal to my editable sheet ---
r.post('/goals', (req, res) => {
  const sheet = getOrCreateMySheet(req.user.id);
  if (sheet.locked || !['draft', 'returned'].includes(sheet.status))
    return res.status(400).json({ error: 'Sheet is not editable' });
  const count = db.prepare('SELECT COUNT(*) c FROM goals WHERE sheet_id=?').get(sheet.id).c;
  if (count >= MAX_GOALS)
    return res.status(400).json({ error: `Maximum ${MAX_GOALS} goals per employee` });
  const g = req.body || {};
  const err = validateGoalInput(g);
  if (err) return res.status(400).json({ error: err });
  const id = db.prepare(`INSERT INTO goals
    (sheet_id,thrust_area_id,title,description,uom_type,target,target_date,weightage)
    VALUES (?,?,?,?,?,?,?,?)`).run(
      sheet.id, g.thrust_area_id, g.title.trim(), g.description || '',
      g.uom_type, g.uom_type === 'timeline' ? null : Number(g.target ?? 0),
      g.uom_type === 'timeline' ? g.target_date : null, Number(g.weightage)).lastInsertRowid;
  audit('goal', id, req.user.id, 'created', null, null, g.title.trim());
  res.json(getSheetDetail(sheet.id));
});

// --- Edit a goal ---
r.put('/goals/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id=?').get(Number(req.params.id));
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(goal.sheet_id);
  const emp = db.prepare('SELECT manager_id FROM users WHERE id=?').get(sheet.employee_id);
  const u = req.user;
  const isOwner = u.id === sheet.employee_id;
  const isManager = u.role === 'manager' && emp.manager_id === u.id;
  const isAdmin = u.role === 'admin';

  // Permission + allowed fields
  let allowed;
  if (isAdmin) {
    allowed = ['thrust_area_id', 'title', 'description', 'uom_type', 'target', 'target_date', 'weightage'];
  } else if (isOwner && ['draft', 'returned'].includes(sheet.status) && !sheet.locked) {
    allowed = goal.shared_origin_id
      ? ['weightage'] // shared copies: weightage only
      : ['thrust_area_id', 'title', 'description', 'uom_type', 'target', 'target_date', 'weightage'];
  } else if (isManager && sheet.status === 'submitted') {
    allowed = ['target', 'target_date', 'weightage']; // inline edit during approval
  } else {
    return res.status(403).json({ error: 'Goal cannot be edited in its current state' });
  }

  const body = req.body || {};
  const merged = { ...goal };
  for (const f of allowed) if (f in body) merged[f] = body[f];
  if (isAdmin || isManager || (isOwner && !goal.shared_origin_id)) {
    const err = validateGoalInput(merged);
    if (err) return res.status(400).json({ error: err });
  }

  tx(() => {
    for (const f of allowed) {
      if (!(f in body)) continue;
      let val = body[f];
      if (['target', 'weightage', 'thrust_area_id'].includes(f) && val != null && val !== '')
        val = Number(val);
      if (String(goal[f] ?? '') === String(val ?? '')) continue;
      db.prepare(`UPDATE goals SET ${f}=? WHERE id=?`).run(val, goal.id);
      audit('goal', goal.id, u.id,
        sheet.locked ? 'post-lock edit' : 'edited', f, goal[f], val);
    }
  });
  res.json(getSheetDetail(sheet.id));
});

// --- Delete a goal ---
r.delete('/goals/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id=?').get(Number(req.params.id));
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(goal.sheet_id);
  const isOwner = req.user.id === sheet.employee_id;
  if (!(req.user.role === 'admin' || (isOwner && ['draft', 'returned'].includes(sheet.status) && !sheet.locked)))
    return res.status(403).json({ error: 'Goal cannot be deleted in its current state' });
  if (goal.shared_origin_id && !(req.user.role === 'admin'))
    return res.status(400).json({ error: 'Shared goals cannot be removed by the recipient' });
  db.prepare('DELETE FROM goals WHERE id=?').run(goal.id);
  audit('goal', goal.id, req.user.id, 'deleted', null, goal.title, null);
  res.json(getSheetDetail(sheet.id));
});

// --- Submit my sheet for approval ---
r.post('/sheets/:id/submit', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(Number(req.params.id));
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (sheet.employee_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (!['draft', 'returned'].includes(sheet.status))
    return res.status(400).json({ error: 'Sheet already submitted' });
  const goals = db.prepare('SELECT * FROM goals WHERE sheet_id=?').all(sheet.id);

  if (goals.length === 0) return res.status(400).json({ error: 'Add at least one goal before submitting' });
  if (goals.length > MAX_GOALS) return res.status(400).json({ error: `Maximum ${MAX_GOALS} goals allowed` });
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  if (Math.round(total * 100) / 100 !== 100)
    return res.status(400).json({ error: `Total weightage must equal 100% (currently ${total}%)` });
  const under = goals.find(g => g.weightage < MIN_WEIGHTAGE);
  if (under) return res.status(400).json({ error: `Each goal needs at least ${MIN_WEIGHTAGE}% weightage` });

  db.prepare(`UPDATE goal_sheets SET status='submitted', return_comment=NULL,
              submitted_at=datetime('now') WHERE id=?`).run(sheet.id);
  audit('goal_sheet', sheet.id, req.user.id, 'submitted');
  onGoalSubmitted(sheet.id);
  res.json(getSheetDetail(sheet.id));
});

// --- Manager approval workflow ---
function assertManagerOf(user, sheet, res) {
  const emp = db.prepare('SELECT manager_id FROM users WHERE id=?').get(sheet.employee_id);
  if (!(user.role === 'manager' && emp.manager_id === user.id) && user.role !== 'admin') {
    res.status(403).json({ error: 'Only the reporting manager can act on this sheet' });
    return false;
  }
  return true;
}

r.post('/sheets/:id/approve', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(Number(req.params.id));
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (!assertManagerOf(req.user, sheet, res)) return;
  if (sheet.status !== 'submitted')
    return res.status(400).json({ error: 'Only submitted sheets can be approved' });
  db.prepare(`UPDATE goal_sheets SET status='approved', locked=1,
              approved_at=datetime('now') WHERE id=?`).run(sheet.id);
  audit('goal_sheet', sheet.id, req.user.id, 'approved & locked');
  onGoalApproved(sheet.id);
  res.json(getSheetDetail(sheet.id));
});

r.post('/sheets/:id/return', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(Number(req.params.id));
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (!assertManagerOf(req.user, sheet, res)) return;
  if (sheet.status !== 'submitted')
    return res.status(400).json({ error: 'Only submitted sheets can be returned' });
  const comment = (req.body?.comment || '').trim();
  if (!comment) return res.status(400).json({ error: 'A return comment is required' });
  db.prepare("UPDATE goal_sheets SET status='returned', return_comment=? WHERE id=?")
    .run(comment, sheet.id);
  audit('goal_sheet', sheet.id, req.user.id, 'returned for rework', null, null, comment);
  onGoalReturned(sheet.id, comment);
  res.json(getSheetDetail(sheet.id));
});

// --- Shared goals: push a departmental KPI to multiple employees ---
r.post('/shared-goals', requireRole('manager', 'admin'), (req, res) => {
  const g = req.body || {};
  const recipientIds = Array.isArray(g.recipient_ids) ? g.recipient_ids.map(Number) : [];
  if (!recipientIds.length) return res.status(400).json({ error: 'Select at least one recipient' });
  const err = validateGoalInput(g);
  if (err) return res.status(400).json({ error: err });
  const invalidRecipients = recipientIds.filter(id =>
    !db.prepare("SELECT id FROM users WHERE id=? AND role='employee'").get(id));
  if (invalidRecipients.length)
    return res.status(400).json({ error: `Invalid recipient id(s): ${invalidRecipients.join(', ')}` });
  const cycle = getActiveCycle();
  const defaultWeight = Number(g.weightage);

  const result = { pushed: [], skipped: [] };
  tx(() => {
    // origin goal lives on the owner's sheet (defaults to the pusher)
    const ownerId = g.owner_id ? Number(g.owner_id) : req.user.id;
    const ownerSheet = getOrCreateMySheet(ownerId);
    const originId = db.prepare(`INSERT INTO goals
      (sheet_id,thrust_area_id,title,description,uom_type,target,target_date,weightage)
      VALUES (?,?,?,?,?,?,?,?)`).run(
        ownerSheet.id, g.thrust_area_id, g.title.trim(), g.description || '', g.uom_type,
        g.uom_type === 'timeline' ? null : Number(g.target ?? 0),
        g.uom_type === 'timeline' ? g.target_date : null, defaultWeight).lastInsertRowid;
    audit('goal', originId, req.user.id, 'shared KPI created', null, null, g.title.trim());

    for (const rid of recipientIds) {
      if (rid === ownerId) continue;
      let sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id=? AND cycle_id=?')
        .get(rid, cycle.id);
      if (!sheet) {
        const sid = db.prepare('INSERT INTO goal_sheets (employee_id,cycle_id,status) VALUES (?,?,?)')
          .run(rid, cycle.id, 'draft').lastInsertRowid;
        sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(sid);
      }
      const emp = db.prepare('SELECT name FROM users WHERE id=?').get(rid);
      if (sheet.locked) { result.skipped.push(emp?.name || rid); continue; }
      const copyId = db.prepare(`INSERT INTO goals
        (sheet_id,thrust_area_id,title,description,uom_type,target,target_date,weightage,shared_origin_id)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(
          sheet.id, g.thrust_area_id, g.title.trim(), g.description || '', g.uom_type,
          g.uom_type === 'timeline' ? null : Number(g.target ?? 0),
          g.uom_type === 'timeline' ? g.target_date : null, defaultWeight, originId).lastInsertRowid;
      audit('goal', copyId, req.user.id, 'shared KPI assigned', null, null, emp?.name);
      result.pushed.push(emp?.name || rid);
    }
  });
  res.json(result);
});

export default r;
