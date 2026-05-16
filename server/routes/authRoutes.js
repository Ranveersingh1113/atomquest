import { Router } from 'express';
import db from '../db.js';
import { signToken, requireAuth } from '../lib/auth.js';

const r = Router();

r.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').trim().toLowerCase());
  if (!user || user.password !== password)
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({
    token: signToken(user.id),
    user: { id: user.id, name: user.name, email: user.email, role: user.role,
            manager_id: user.manager_id, department: user.department, title: user.title },
  });
});

r.get('/me', requireAuth, (req, res) => res.json(req.user));

// Demo helper — list the seeded accounts for quick role switching.
r.get('/demo-accounts', (_req, res) => {
  res.json(db.prepare('SELECT name,email,role,department,title FROM users ORDER BY role,name').all());
});

export default r;
