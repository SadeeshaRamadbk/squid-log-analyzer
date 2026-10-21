import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDatabase } from './index';

export function clearSyslogData(): void {
  const db = getDatabase();
  console.log('[DB] Clearing syslog events from database...');
  db.transaction(() => {
    db.prepare('DELETE FROM syslog_events').run();
    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'syslog_events'").run();
    } catch {}
  })();
  console.log('[DB] Syslog events cleared successfully.');
}

export function clearAllData(): void {
  const db = getDatabase();
  console.log('[DB] Clearing all dummy records from database...');

  const clear = db.transaction(() => {
    db.prepare('DELETE FROM raw_logs').run();
    db.prepare('DELETE FROM daily_summaries').run();
    db.prepare('DELETE FROM netflow_logs').run();
    db.prepare('DELETE FROM netflow_daily_summaries').run();
    db.prepare('DELETE FROM syslog_events').run();
    db.prepare('DELETE FROM system_meta').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('raw_logs', 'daily_summaries', 'netflow_logs', 'netflow_daily_summaries', 'syslog_events')").run();
  });

  clear();
  db.pragma('vacuum');

  console.log('[DB] All tables cleared successfully. SQLite vacuum executed.');
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('clear.ts'))) {
  try {
    clearAllData();
    process.exit(0);
  } catch (err) {
    console.error('[DB] Error clearing data:', err);
    process.exit(1);
  }
}
