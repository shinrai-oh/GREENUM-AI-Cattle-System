import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRouter } from './routes/auth';
import { cattleRouter } from './routes/cattle';
import { measurementsRouter } from './routes/measurements';
import { reportsRouter } from './routes/reports';
import { ensureDb } from './bootstrapDb';
import { runDevSeed } from './devSeed';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/cattle', cattleRouter);
app.use('/api/v1', measurementsRouter);
app.use('/api/v1/reports', reportsRouter);

// Serve frontend static files (SPA) from the same backend
const frontendDir = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendDir));
app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

// Bootstrap SQLite schema and optional seed in dev
(async () => {
  try {
    await ensureDb();
    if (process.env.AUTO_SEED === 'true') {
      await runDevSeed();
    }
    console.log('DB bootstrap completed');
  } catch (err) {
    console.error('DB bootstrap failed', err);
  }
})();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
