import './loadenv.js'; // must run before any module that reads process.env
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import authRoutes from './routes/authRoutes.js';
import sso from './routes/sso.js';
import ref from './routes/ref.js';
import goals from './routes/goals.js';
import tracking from './routes/tracking.js';
import governance from './routes/governance.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRoutes);
app.use('/api', sso);
app.use('/api', ref);
app.use('/api', goals);
app.use('/api', tracking);
app.use('/api', governance);

// Unknown API routes → JSON 404 (never fall through to the SPA).
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Production: serve the built SPA from one process (cost-optimised single host).
const clientDist = join(__dirname, '../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Atomberg API on http://localhost:${PORT}`));
