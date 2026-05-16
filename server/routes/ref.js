import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { getActiveCycle, openQuarters } from '../lib/sheets.js';

const r = Router();
r.use(requireAuth);

r.get('/thrust-areas', (_req, res) => {
  res.json(db.prepare('SELECT * FROM thrust_areas ORDER BY name').all());
});

r.get('/cycle', (_req, res) => {
  const cycle = getActiveCycle();
  res.json({ ...cycle, openQuarters: openQuarters(cycle) });
});

// Org directory. Admin: everyone. Manager: direct reports. Employee: self.
r.get('/users', (req, res) => {
  let rows;
  if (req.user.role === 'admin')
    rows = db.prepare('SELECT id,name,email,role,manager_id,department,title FROM users ORDER BY name').all();
  else if (req.user.role === 'manager')
    rows = db.prepare('SELECT id,name,email,role,manager_id,department,title FROM users WHERE manager_id=? OR id=? ORDER BY name').all(req.user.id, req.user.id);
  else
    rows = [db.prepare('SELECT id,name,email,role,manager_id,department,title FROM users WHERE id=?').get(req.user.id)];
  res.json(rows);
});

export default r;
