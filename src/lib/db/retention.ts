import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDatabase } from './index';

export interface RetentionResult {
  deletedRows: number;
  retentionDays: number;
  cutoffDate: string;
  cutoffTimestamp: number;
  executedAt: string;
}

export function runRetentionJob(retentionDays = 60): RetentionResult {
  const db = getDatabase();
  const configuredDays = Number(process.env.RETENTION_DAYS) || retentionDays;
  
  // Calculate cutoff timestamp (X days ago in ms)
  const now = Date.now();
  const cutoffTimestamp = now - configuredDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffTimestamp).toISOString();

  console.log(`[Retention Job] Deleting raw_logs older than ${configuredDays} days (prior to ${cutoffDate})...`);

  const deleteStmt = db.prepare('DELETE FROM raw_logs WHERE timestamp < ?');
  const info = deleteStmt.run(cutoffTimestamp);
  const deletedRows = info.changes;

  // Record retention execution in metadata
  const metaStmt = db.prepare(`
    INSERT INTO system_meta (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  metaStmt.run('last_retention_run', JSON.stringify({
    deletedRows,
    cutoffTimestamp,
    cutoffDate,
    executedAt: new Date().toISOString()
  }), now);

  // SQLite optimization pragma
  db.pragma('optimize');

  console.log(`[Retention Job] Successfully deleted ${deletedRows} old raw log records.`);

  return {
    deletedRows,
    retentionDays: configuredDays,
    cutoffDate,
    cutoffTimestamp,
    executedAt: new Date().toISOString(),
  };
}

// Allow direct execution via CLI `npm run retention`
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('retention.ts'))) {
  try {
    const result = runRetentionJob();
    console.log('[Retention Job] Result:', result);
    process.exit(0);
  } catch (error) {
    console.error('[Retention Job] Error:', error);
    process.exit(1);
  }
}
