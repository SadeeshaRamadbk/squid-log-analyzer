import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import path from 'path';
import fs from 'fs';
import { getDatabase } from './index';

export async function runCliBackup(customDest?: string): Promise<string> {
  const db = getDatabase();
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const destPath = customDest
    ? path.resolve(process.cwd(), customDest)
    : path.join(backupDir, `squid_analytics_backup_${dateStr}.db`);

  console.log(`[Backup] Exporting clean SQLite backup to ${destPath}...`);
  await db.backup(destPath);

  const stats = fs.statSync(destPath);
  console.log(`[Backup] Success! File size: ${(stats.size / 1024).toFixed(1)} KB`);
  return destPath;
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('backup.ts'))) {
  const target = process.argv[2];
  runCliBackup(target)
    .then((filePath) => {
      console.log(`[Backup] Saved to: ${filePath}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Backup] Failed:', err);
      process.exit(1);
    });
}
