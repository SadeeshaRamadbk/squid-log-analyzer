import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getDatabasePath, closeDatabase, reopenDatabase } from './index';

export function runCliRestore(sourcePath: string): void {
  const resolvedSource = path.resolve(process.cwd(), sourcePath);

  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Source backup file not found at: ${resolvedSource}`);
  }

  console.log(`[Restore] Verifying backup file at: ${resolvedSource}...`);

  // Verify file has valid SQLite integrity
  const testDb = new Database(resolvedSource, { readonly: true });
  const check = testDb.pragma('integrity_check', { simple: true });
  testDb.close();

  if (check !== 'ok') {
    throw new Error(`Database integrity verification failed: ${check}`);
  }

  // Close live connection
  closeDatabase();

  const targetDbPath = getDatabasePath();
  const walPath = `${targetDbPath}-wal`;
  const shmPath = `${targetDbPath}-shm`;

  const dbDir = path.dirname(targetDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Clean old WAL/SHM
  if (fs.existsSync(walPath)) {
    try { fs.unlinkSync(walPath); } catch {}
  }
  if (fs.existsSync(shmPath)) {
    try { fs.unlinkSync(shmPath); } catch {}
  }

  console.log(`[Restore] Copying verified database to ${targetDbPath}...`);
  fs.copyFileSync(resolvedSource, targetDbPath);

  // Reopen and ensure schema
  const db = reopenDatabase();
  const rawCount = db.prepare('SELECT count(*) as count FROM raw_logs').get() as any;
  const summaryCount = db.prepare('SELECT count(*) as count FROM daily_summaries').get() as any;
  const mappingCount = db.prepare('SELECT count(*) as count FROM ip_mappings').get() as any;

  console.log('[Restore] Database restored successfully!');
  console.log(`[Restore] Current Records -> Raw Logs: ${rawCount?.count || 0}, Summaries: ${summaryCount?.count || 0}, IP Mappings: ${mappingCount?.count || 0}`);
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('restore.ts'))) {
  const source = process.argv[2];
  if (!source) {
    console.error('Usage: npm run restore <path-to-backup.db>');
    process.exit(1);
  }

  try {
    runCliRestore(source);
    process.exit(0);
  } catch (err: any) {
    console.error('[Restore] Error:', err.message);
    process.exit(1);
  }
}
