import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import ref from './routes/ref.js';
import goals from './routes/goals.js';
import tracking from './routes/tracking.js';
import governance from './routes/governance.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRoutes);
app.use('/api', ref);
app.use('/api', goals);
app.use('/api', tracking);
app.use('/api', governance);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`AtomQuest API on http://localhost:${PORT}`));
