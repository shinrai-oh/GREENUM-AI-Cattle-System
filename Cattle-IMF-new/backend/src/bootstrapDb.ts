import { getPrisma } from './db';

async function ensureTable(name: string, createSql: string) {
  const prisma = getPrisma();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`
  );
  if (!rows || rows.length === 0) {
    await prisma.$executeRawUnsafe(createSql);
  }
}

export async function ensureDb() {
  // Only applicable for SQLite provider in dev
  const userSql = `
    CREATE TABLE IF NOT EXISTS "User" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `;
  const groupSql = `
    CREATE TABLE IF NOT EXISTS "CattleGroup" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupName TEXT NOT NULL,
      description TEXT
    );
  `;
  const profileSql = `
    CREATE TABLE IF NOT EXISTS "CattleProfile" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      earTagId TEXT NOT NULL UNIQUE,
      birthDate DATETIME,
      breed TEXT,
      sex TEXT,
      sireEarTagId TEXT,
      damEarTagId TEXT,
      groupId INTEGER,
      FOREIGN KEY(groupId) REFERENCES CattleGroup(id)
    );
  `;
  const measurementSql = `
    CREATE TABLE IF NOT EXISTS "Measurement" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cattleProfileId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      measurementDate DATETIME NOT NULL,
      backfatThickness REAL,
      ribeyeArea REAL,
      intramuscularFatImf REAL,
      ribeyeHeight REAL,
      ribeyeWidth REAL,
      notes TEXT,
      simulatedGrade TEXT,
      FOREIGN KEY(cattleProfileId) REFERENCES CattleProfile(id),
      FOREIGN KEY(userId) REFERENCES User(id)
    );
  `;

  await ensureTable('User', userSql);
  await ensureTable('CattleGroup', groupSql);
  await ensureTable('CattleProfile', profileSql);
  await ensureTable('Measurement', measurementSql);
}

