import { PrismaClient } from '@prisma/client';
import path from 'path';

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    // Ensure SQLite DATABASE_URL points to an absolute path under backend/prisma
    const currentUrl = process.env.DATABASE_URL || '';
    if (currentUrl.startsWith('file:')) {
      const dbAbs = path.resolve(__dirname, '../prisma/dev.db');
      // Prisma expects forward slashes in file path URLs
      const normalized = 'file:' + dbAbs.replace(/\\/g, '/');
      process.env.DATABASE_URL = normalized;
    }
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}
