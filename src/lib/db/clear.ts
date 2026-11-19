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
    // 1. Squid Proxy telemetry
    db.prepare('DELETE FROM raw_logs').run();
    db.prepare('DELETE FROM daily_summaries').run();
    try { db.prepare('DELETE FROM proxy_hourly_rollups').run(); } catch {}

    // 2. NetFlow telemetry
    db.prepare('DELETE FROM netflow_logs').run();
    db.prepare('DELETE FROM netflow_daily_summaries').run();
    try { db.prepare('DELETE FROM netflow_minute_rollups').run(); } catch {}
    try { db.prepare('DELETE FROM netflow_hourly_rollups').run(); } catch {}

    // 3. Syslog events
    db.prepare('DELETE FROM syslog_events').run();

    // 4. Security alerts & operational metadata
    try { db.prepare('DELETE FROM security_alerts').run(); } catch {}
    db.prepare('DELETE FROM system_meta').run();

    // 5. Reset autoincrement sequences
    try {
      db.prepare(`
        DELETE FROM sqlite_sequence WHERE name IN (
          'raw_logs', 'daily_summaries', 'proxy_hourly_rollups',
          'netflow_logs', 'netflow_daily_summaries', 'netflow_minute_rollups', 'netflow_hourly_rollups',
          'syslog_events', 'security_alerts'
        )
      `).run();
    } catch {}
  });

  clear();
  console.log('[DB] Executing VACUUM to reclaim disk space...');
  db.pragma('vacuum');

  console.log('[DB] All dummy telemetry records successfully wiped. Database is clean and ready for production.');
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
