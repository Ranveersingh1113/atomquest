import crypto from 'crypto';
import db from '../db.js';

const SECRET = process.env.AUTH_SECRET || 'atomberg-demo-secret';

export function signToken(userId) {
  const sig = crypto.createHmac('sha256', SECRET).update(String(userId)).digest('hex');
  return `${userId}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const [id, sig] = token.split('.');
  if (!id || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(id).digest('hex');
  if (sig !== expected) return null;
  return db.prepare('SELECT id,name,email,role,manager_id,department,title FROM users WHERE id=?').get(Number(id)) || null;
}

export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden — requires role: ' + roles.join('/') });
    next();
  };
}
