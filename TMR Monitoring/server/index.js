import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { init, getDb } from './db.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*'
  }
});

app.use(cors());
app.use(express.json());

// Initialize DB and seed
init();
const db = getDb();

// Static hosting of built frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(__dirname, '../web/dist');
app.use(express.static(staticDir));
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// ---- REST APIs ----
// Devices
app.get('/api/devices', (req, res) => {
  const devices = db.prepare('SELECT * FROM TMR_Device').all();
  res.json(devices);
});

app.get('/api/devices/:id', (req, res) => {
  const d = db.prepare('SELECT * FROM TMR_Device WHERE id = ?').get(req.params.id);
  if (!d) return res.status(404).json({ message: 'Device not found' });
  res.json(d);
});

// ROI
app.get('/api/roi/:deviceId', (req, res) => {
  const r = db.prepare('SELECT * FROM Camera_ROI WHERE device_id = ? ORDER BY id DESC LIMIT 1').get(req.params.deviceId);
  if (!r) return res.json({ device_id: Number(req.params.deviceId), roi1: null, roi2: null });
  res.json({
    id: r.id,
    device_id: r.device_id,
    roi1: r.roi1 ? JSON.parse(r.roi1) : null,
    roi2: r.roi2 ? JSON.parse(r.roi2) : null,
    updated_at: r.updated_at
  });
});

app.post('/api/roi/:deviceId', (req, res) => {
  const { roi1, roi2 } = req.body;
  const deviceId = Number(req.params.deviceId);
  const updated_at = new Date().toISOString();
  const insert = db.prepare('INSERT INTO Camera_ROI (device_id, roi1, roi2, updated_at) VALUES (?, ?, ?, ?)');
  const info = insert.run(deviceId, roi1 ? JSON.stringify(roi1) : null, roi2 ? JSON.stringify(roi2) : null, updated_at);
  res.json({ id: info.lastInsertRowid, device_id: deviceId, roi1, roi2, updated_at });
});

// Formulas
app.get('/api/formulas', (req, res) => {
  const rows = db.prepare('SELECT * FROM Feed_Formula').all();
  res.json(rows.map(r => ({ id: r.id, name: r.name, items: JSON.parse(r.items) })));
});

app.post('/api/formulas', (req, res) => {
  const { name, items } = req.body;
  const info = db.prepare('INSERT INTO Feed_Formula (name, items) VALUES (?, ?)')
    .run(name, JSON.stringify(items || []));
  res.json({ id: info.lastInsertRowid, name, items: items || [] });
});

app.put('/api/formulas/:id', (req, res) => {
  const { name, items } = req.body;
  const id = Number(req.params.id);
  db.prepare('UPDATE Feed_Formula SET name = ?, items = ? WHERE id = ?')
    .run(name, JSON.stringify(items || []), id);
  res.json({ id, name, items: items || [] });
});

app.delete('/api/formulas/:id', (req, res) => {
  db.prepare('DELETE FROM Feed_Formula WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT t.id, t.device_id, t.date, t.status, f.name AS formula_name, f.items AS formula_items
    FROM Daily_Task t
    JOIN Feed_Formula f ON f.id = t.formula_id
    WHERE t.date = ?
  `).all(date);
  res.json(rows.map(r => ({
    id: r.id,
    device_id: r.device_id,
    date: r.date,
    status: r.status,
    formula: { name: r.formula_name, items: JSON.parse(r.formula_items) }
  })));
});

app.post('/api/tasks', (req, res) => {
  const { device_id, date, formula_id, status } = req.body;
  const info = db.prepare('INSERT INTO Daily_Task (device_id, date, formula_id, status) VALUES (?, ?, ?, ?)')
    .run(device_id, date, formula_id, status || 'pending');
  res.json({ id: info.lastInsertRowid, device_id, date, formula_id, status: status || 'pending' });
});

app.put('/api/tasks/:id', (req, res) => {
  const { status } = req.body;
  const id = Number(req.params.id);
  db.prepare('UPDATE Daily_Task SET status = ? WHERE id = ?').run(status, id);
  res.json({ id, status });
});

// ---- WebSocket (Simulated Real-Time) ----
// Broadcasts device status and progress every 2 seconds
function generateSimulatedStatus() {
  const devices = db.prepare('SELECT * FROM TMR_Device').all();
  const today = new Date().toISOString().slice(0, 10);
  const tasks = db.prepare('SELECT * FROM Daily_Task WHERE date = ?').all(today);

  return devices.map(d => {
    const task = tasks.find(t => t.device_id === d.id);
    const formula = task ? db.prepare('SELECT * FROM Feed_Formula WHERE id = ?').get(task.formula_id) : null;
    const items = formula ? JSON.parse(formula.items) : [];

    // Simulate actual weights as progress against targets
    const progress = items.map(it => {
      const target = it.targetWeightKg;
      const actual = Math.max(0, Math.min(target, target * (0.6 + Math.random() * 0.6)));
      const errorPct = target ? ((actual - target) / target) * 100 : 0;
      return {
        material: it.material,
        targetKg: target,
        actualKg: Number(actual.toFixed(1)),
        errorPct: Number(errorPct.toFixed(1))
      };
    });

    const overallTarget = items.reduce((s, it) => s + it.targetWeightKg, 0);
    const overallActual = progress.reduce((s, p) => s + p.actualKg, 0);
    const overallPct = overallTarget ? Math.min(100, Math.round((overallActual / overallTarget) * 100)) : 0;

    return {
      deviceId: d.id,
      deviceName: d.name,
      status: overallPct >= 100 ? 'done' : 'mixing',
      progressPct: overallPct,
      items: progress,
      timestamp: new Date().toISOString()
    };
  });
}

// Reports: daily summary using simulated status
app.get('/api/reports/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const tasks = db.prepare(`
    SELECT t.device_id, f.items AS formula_items
    FROM Daily_Task t JOIN Feed_Formula f ON f.id = t.formula_id
    WHERE t.date = ?
  `).all(date);
  const plannedByDevice = new Map();
  for (const t of tasks) {
    const items = JSON.parse(t.formula_items);
    plannedByDevice.set(t.device_id, items);
  }
  const status = generateSimulatedStatus();
  const summary = status.map(s => {
    const planned = plannedByDevice.get(s.deviceId) || [];
    const plannedTotal = planned.reduce((sum, it) => sum + (it.targetWeightKg || 0), 0);
    const actualTotal = s.items.reduce((sum, it) => sum + (it.actualKg || 0), 0);
    return {
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      plannedItems: planned,
      actualItems: s.items,
      plannedTotalKg: Number(plannedTotal.toFixed(1)),
      actualTotalKg: Number(actualTotal.toFixed(1)),
      progressPct: s.progressPct,
      timestamp: s.timestamp
    };
  });
  res.json({ date, summary });
});

io.on('connection', (socket) => {
  socket.emit('hello', { message: 'Connected to TMR monitoring realtime channel' });
});

setInterval(() => {
  const payload = generateSimulatedStatus();
  io.emit('status', payload);
}, 2000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
