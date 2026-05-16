import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { getSheetDetail, getActiveCycle, openQuarters, QUARTERS } from '../lib/sheets.js';
import { goalScore } from '../lib/scoring.js';

const r = Router();
r.use(requireAuth);

// Sheet ids visible to the current user.
function visibleSheetIds(user) {
  if (user.role === 'admin')
    return db.prepare('SELECT id FROM goal_sheets').all().map(x => x.id);
  if (user.role === 'manager')
    return db.prepare(`SELECT gs.id FROM goal_sheets gs JOIN users u ON u.id=gs.employee_id
                       WHERE u.manager_id=?`).all(user.id).map(x => x.id);
  return db.prepare('SELECT id FROM goal_sheets WHERE employee_id=?').all(user.id).map(x => x.id);
}

const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

// --- Achievement Report (CSV export) ---
r.get('/reports/achievement.csv', (req, res) => {
  const ids = visibleSheetIds(req.user);
  const header = ['Employee', 'Department', 'Cycle', 'Thrust Area', 'Goal', 'UoM', 'Weightage %',
    'Planned Target', 'Q1 Actual', 'Q2 Actual', 'Q3 Actual', 'Q4 Actual',
    'Q1 Score %', 'Q2 Score %', 'Q3 Score %', 'Q4 Score %', 'Sheet Status'];
  const lines = [header.map(csvCell).join(',')];
  for (const id of ids) {
    const s = getSheetDetail(id);
    for (const g of s.goals) {
      const planned = g.uom_type === 'timeline' ? g.target_date : g.target;
      const row = [s.employee_name, s.department, s.fy, g.thrust_area, g.title, g.uom_type,
        g.weightage, planned];
      for (const q of QUARTERS) {
        const a = g.achievements[q];
        row.push(a ? (g.uom_type === 'timeline' ? (a.completion_date || a.status) : a.actual_value) : '');
      }
      for (const q of QUARTERS) {
        const sc = g.scores[q];
        row.push(sc == null ? '' : Math.round(sc * 100));
      }
      row.push(s.status);
      lines.push(row.map(csvCell).join(','));
    }
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="achievement-report.csv"');
  res.send(lines.join('\r\n'));
});

// --- Completion Dashboard ---
r.get('/reports/completion', (req, res) => {
  const cycle = getActiveCycle();
  const open = openQuarters(cycle);
  const ids = visibleSheetIds(req.user);
  const rows = ids.map(id => {
    const s = getSheetDetail(id);
    const quarters = {};
    for (const q of QUARTERS) {
      const employeeDone = s.goals.length > 0 &&
        s.goals.every(g => g.achievements[q] && g.achievements[q].status !== 'Not Started');
      const anyLogged = s.goals.some(g => g.achievements[q]);
      quarters[q] = {
        open: open.includes(q),
        employeeUpdated: anyLogged,
        employeeComplete: employeeDone,
        managerCheckedIn: !!s.checkins[q],
      };
    }
    return {
      sheetId: id, employee: s.employee_name, department: s.department,
      status: s.status, totalWeightage: s.totalWeightage, quarters,
    };
  });
  res.json({ openQuarters: open, rows });
});

// --- Audit Trail ---
r.get('/audit', (req, res) => {
  let rows = db.prepare(`
    SELECT a.*, u.name AS user_name FROM audit_log a
    LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC`).all();
  if (req.user.role !== 'admin') {
    // limit managers/employees to entities on visible sheets
    const ids = new Set(visibleSheetIds(req.user));
    const goalIds = new Set(
      db.prepare('SELECT id,sheet_id FROM goals').all()
        .filter(g => ids.has(g.sheet_id)).map(g => g.id));
    rows = rows.filter(a =>
      (a.entity === 'goal_sheet' || a.entity === 'checkin') ? ids.has(a.entity_id)
        : (a.entity === 'goal' || a.entity === 'achievement') ? goalIds.has(a.entity_id)
          : false);
  }
  res.json(rows);
});

// --- Admin: cycle configuration ---
r.put('/cycles/:id', requireRole('admin'), (req, res) => {
  const cycle = db.prepare('SELECT * FROM cycles WHERE id=?').get(Number(req.params.id));
  if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
  const fields = ['name', 'fy', 'status', 'goal_window_open', 'q1_open', 'q2_open', 'q3_open', 'q4_open'];
  for (const f of fields) {
    if (f in (req.body || {})) {
      db.prepare(`UPDATE cycles SET ${f}=? WHERE id=?`).run(req.body[f], cycle.id);
      audit('cycle', cycle.id, req.user.id, 'cycle config changed', f, cycle[f], req.body[f]);
    }
  }
  res.json(db.prepare('SELECT * FROM cycles WHERE id=?').get(cycle.id));
});

// --- Admin: unlock a goal sheet (exception handling) ---
r.post('/sheets/:id/unlock', requireRole('admin'), (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id=?').get(Number(req.params.id));
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (!sheet.locked) return res.status(400).json({ error: 'Sheet is not locked' });
  db.prepare("UPDATE goal_sheets SET locked=0, status='returned', return_comment=? WHERE id=?")
    .run(req.body?.reason || 'Unlocked by Admin for correction', sheet.id);
  audit('goal_sheet', sheet.id, req.user.id, 'unlocked by admin', null, 'locked', 'editable');
  res.json(getSheetDetail(sheet.id));
});

// --- Analytics ---
r.get('/analytics', (req, res) => {
  const ids = visibleSheetIds(req.user);
  const sheets = ids.map(getSheetDetail);
  const approved = sheets.filter(s => s.status === 'approved');

  // QoQ trend — average weighted progress per quarter
  const qoq = QUARTERS.map(q => {
    const scored = approved.filter(s => s.goals.some(g => g.achievements[q]));
    const avg = scored.length
      ? scored.reduce((a, s) => a + s.quarterScores[q], 0) / scored.length : 0;
    return { quarter: q, avgProgress: Math.round(avg * 10) / 10, sheets: scored.length };
  });

  // QoQ by department
  const depts = [...new Set(sheets.map(s => s.department))];
  const byDept = depts.map(d => {
    const ds = approved.filter(s => s.department === d);
    const point = { department: d };
    for (const q of QUARTERS) {
      const scored = ds.filter(s => s.goals.some(g => g.achievements[q]));
      point[q] = scored.length
        ? Math.round(scored.reduce((a, s) => a + s.quarterScores[q], 0) / scored.length * 10) / 10 : 0;
    }
    return point;
  });

  // Distribution
  const allGoals = sheets.flatMap(s => s.goals);
  const countBy = (arr, key) => {
    const m = {};
    for (const x of arr) m[x[key]] = (m[x[key]] || 0) + 1;
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  };
  const latestStatus = g => {
    for (const q of [...QUARTERS].reverse()) if (g.achievements[q]) return g.achievements[q].status;
    return 'Not Started';
  };
  const distribution = {
    byThrustArea: countBy(allGoals, 'thrust_area'),
    byUom: countBy(allGoals, 'uom_type'),
    byStatus: countBy(allGoals.map(g => ({ s: latestStatus(g) })), 's'),
  };

  // Manager effectiveness — check-in completion rate
  const cycle = getActiveCycle();
  const open = openQuarters(cycle);
  const managers = db.prepare("SELECT id,name FROM users WHERE role='manager'").all();
  const managerEffectiveness = managers.map(m => {
    const teamSheets = db.prepare(`SELECT gs.id FROM goal_sheets gs JOIN users u ON u.id=gs.employee_id
      WHERE u.manager_id=? AND gs.status='approved'`).all(m.id).map(x => x.id);
    const expected = teamSheets.length * open.length;
    let done = 0;
    for (const sid of teamSheets) {
      const cs = getSheetDetail(sid).checkins;
      done += open.filter(q => cs[q]).length;
    }
    return {
      manager: m.name, teamSize: teamSheets.length,
      checkinRate: expected ? Math.round(done / expected * 100) : 0,
    };
  });

  res.json({ qoq, byDept, distribution, managerEffectiveness });
});

// --- Escalation Module (rule-based) ---
function evaluateEscalations() {
  const cycle = getActiveCycle();
  const today = new Date();
  const days = (a, b) => Math.floor((b - new Date(a)) / 86400000);
  const found = [];
  const sheets = db.prepare(`SELECT gs.*, u.name AS emp, u.manager_id FROM goal_sheets gs
    JOIN users u ON u.id=gs.employee_id WHERE gs.cycle_id=?`).all(cycle.id);

  for (const s of sheets) {
    // Rule 1: goals not submitted within 7 days of goal window opening
    if (['draft', 'returned'].includes(s.status) && cycle.goal_window_open) {
      const overdue = days(cycle.goal_window_open, today);
      if (overdue > 7)
        found.push({ rule: 'Goals not submitted', employee_id: s.employee_id,
          detail: `${s.emp} — ${overdue} days since goal window opened`,
          level: escLevel(overdue) });
    }
    // Rule 2: submitted goals not approved within 7 days
    if (s.status === 'submitted' && s.submitted_at) {
      const overdue = days(s.submitted_at, today);
      if (overdue > 7)
        found.push({ rule: 'Approval pending', employee_id: s.employee_id,
          detail: `${s.emp} — submitted ${overdue} days ago, awaiting manager approval`,
          level: escLevel(overdue) });
    }
    // Rule 3: latest open quarter check-in not completed
    if (s.status === 'approved') {
      const open = openQuarters(cycle, today);
      const q = open[open.length - 1];
      if (q) {
        const checkin = db.prepare('SELECT id FROM checkins WHERE sheet_id=? AND quarter=?')
          .get(s.id, q);
        if (!checkin)
          found.push({ rule: 'Check-in overdue', employee_id: s.employee_id,
            detail: `${s.emp} — ${q} check-in not completed`, level: 'L2 - Manager' });
      }
    }
  }
  return found;
}
function escLevel(d) { return d <= 14 ? 'L1 - Employee' : d <= 28 ? 'L2 - Manager' : 'L3 - HR'; }

r.get('/escalations', (req, res) => {
  res.json(db.prepare(`SELECT e.*, u.name AS employee FROM escalations e
    JOIN users u ON u.id=e.employee_id ORDER BY e.id DESC`).all());
});

r.post('/escalations/run', requireRole('admin'), (req, res) => {
  db.prepare("DELETE FROM escalations WHERE status='open'").run();
  const found = evaluateEscalations();
  const ins = db.prepare(`INSERT INTO escalations (rule,employee_id,detail,level)
    VALUES (?,?,?,?)`);
  for (const e of found) ins.run(e.rule, e.employee_id, e.detail, e.level);
  audit('escalation', 0, req.user.id, 'escalation rules evaluated', null, null, `${found.length} raised`);
  res.json(db.prepare(`SELECT e.*, u.name AS employee FROM escalations e
    JOIN users u ON u.id=e.employee_id ORDER BY e.id DESC`).all());
});

r.put('/escalations/:id/resolve', requireRole('admin'), (req, res) => {
  db.prepare("UPDATE escalations SET status='resolved' WHERE id=?").run(Number(req.params.id));
  audit('escalation', Number(req.params.id), req.user.id, 'escalation resolved');
  res.json({ ok: true });
});

export default r;
