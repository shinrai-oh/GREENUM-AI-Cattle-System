import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'tmr.db'));

function init() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS TMR_Device (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      camera_ip TEXT,
      status TEXT DEFAULT 'idle'
    );

    CREATE TABLE IF NOT EXISTS Camera_ROI (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      roi1 TEXT, -- JSON {x,y,width,height}
      roi2 TEXT, -- JSON {x,y,width,height}
      updated_at TEXT,
      FOREIGN KEY(device_id) REFERENCES TMR_Device(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Feed_Formula (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      items TEXT NOT NULL -- JSON [{material, targetWeightKg}]
    );

    CREATE TABLE IF NOT EXISTS Daily_Task (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      formula_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY(device_id) REFERENCES TMR_Device(id) ON DELETE CASCADE,
      FOREIGN KEY(formula_id) REFERENCES Feed_Formula(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Feeding_Event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      ts TEXT NOT NULL,
      material TEXT,
      weight REAL,
      snapshot_path TEXT,
      FOREIGN KEY(device_id) REFERENCES TMR_Device(id) ON DELETE CASCADE
    );
  `);

  // Seed devices
  const deviceCount = db.prepare('SELECT COUNT(*) AS c FROM TMR_Device').get().c;
  if (deviceCount === 0) {
    const insertDevice = db.prepare('INSERT INTO TMR_Device (name, camera_ip, status) VALUES (?, ?, ?)');
    insertDevice.run('TMR-车1', 'rtsp://192.168.1.101/stream', 'idle');
    insertDevice.run('TMR-车2', 'rtsp://192.168.1.102/stream', 'idle');
    insertDevice.run('TMR-车3', 'rtsp://192.168.1.103/stream', 'idle');
  }

  // Seed formulas
  const formulaCount = db.prepare('SELECT COUNT(*) AS c FROM Feed_Formula').get().c;
  if (formulaCount === 0) {
    const insertFormula = db.prepare('INSERT INTO Feed_Formula (name, items) VALUES (?, ?)');
    insertFormula.run('育肥牛标准配方', JSON.stringify([
      { material: '青贮玉米', targetWeightKg: 1500 },
      { material: '苜蓿干草', targetWeightKg: 300 },
      { material: '豆粕', targetWeightKg: 100 }
    ]));
    insertFormula.run('青年牛基础配方', JSON.stringify([
      { material: '青贮玉米', targetWeightKg: 1200 },
      { material: '苜蓿干草', targetWeightKg: 250 },
      { material: '豆粕', targetWeightKg: 80 }
    ]));
  }

  // Seed tasks for today for all devices
  const today = new Date().toISOString().slice(0, 10);
  const devices = db.prepare('SELECT * FROM TMR_Device').all();
  const formula = db.prepare('SELECT id FROM Feed_Formula LIMIT 1').get();
  const taskExistsStmt = db.prepare('SELECT COUNT(*) AS c FROM Daily_Task WHERE device_id = ? AND date = ?');
  const insertTaskStmt = db.prepare('INSERT INTO Daily_Task (device_id, date, formula_id, status) VALUES (?, ?, ?, ?)');
  for (const d of devices) {
    const c = taskExistsStmt.get(d.id, today).c;
    if (c === 0) {
      insertTaskStmt.run(d.id, today, formula.id, 'pending');
    }
  }
}

function getDb() {
  return db;
}

export { init, getDb };

