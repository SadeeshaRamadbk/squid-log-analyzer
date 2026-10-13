import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './schema';

let dbInstance: Database.Database | null = null;

export function getDatabasePath(): string {
  const customPath = process.env.DATABASE_PATH;
  if (customPath) {
    if (path.isAbsolute(customPath)) {
      return customPath;
    }
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), customPath);
  }
  return path.join(process.cwd(), 'data', 'squid_analytics.db');
}

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  initializeDatabase(dbInstance);

  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      console.warn('Error closing database:', e);
    }
    dbInstance = null;
  }
}

export function reopenDatabase(): Database.Database {
  closeDatabase();
  return getDatabase();
}

export default getDatabase;

