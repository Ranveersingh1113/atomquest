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
            manager_id: user.manager_id, department: user.department, title: user.title,
            auth_provider: user.auth_provider },
  });
});

r.get('/me', requireAuth, (req, res) => res.json(req.user));

// Demo helper — list the seeded local accounts for quick role switching.
// SSO-provisioned (Entra) accounts are excluded — they sign in via Microsoft.
r.get('/demo-accounts', (_req, res) => {
  res.json(db.prepare(
    "SELECT name,email,role,department,title FROM users WHERE auth_provider='local' ORDER BY role,name"
  ).all());
});

export default r;
