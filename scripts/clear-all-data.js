const path = require('path');
const fs = require('fs');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  Database = require(path.resolve(process.cwd(), 'node_modules', 'better-sqlite3'));
}

// Check DATABASE_PATH from env or default
let dbPath = process.env.DATABASE_PATH || './data/squid_analytics.db';
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/^DATABASE_PATH\s*=\s*(.+)$/m);
  if (match) {
    dbPath = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
console.log(`Connecting to database at: ${resolvedPath}`);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Database file does not exist at: ${resolvedPath}`);
  process.exit(1);
}

try {
  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 30000');

  console.log('[Clear] Deleting all dummy/demo telemetry data from SQLite tables...');

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
    try { db.prepare('DELETE FROM syslog_events').run(); } catch {}

    // 4. Security alerts & operational tracking metadata
    try { db.prepare('DELETE FROM security_alerts').run(); } catch {}
    try { db.prepare('DELETE FROM system_meta').run(); } catch {}

    // 5. Reset sequence counters
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
  console.log('[Clear] All dummy records deleted.');
  console.log('[Clear] Checkpointing WAL and executing VACUUM to reclaim disk space...');
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
  db.pragma('vacuum');

  // Verify counts
  console.log('\n--- Database Table Row Verification ---');
  const tables = [
    'raw_logs',
    'daily_summaries',
    'proxy_hourly_rollups',
    'netflow_logs',
    'netflow_daily_summaries',
    'netflow_minute_rollups',
    'netflow_hourly_rollups',
    'syslog_events',
    'security_alerts',
    'ip_mappings',
    'users',
  ];

  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT count(*) as cnt FROM ${table}`).get();
      console.log(`  ${table.padEnd(25)}: ${row.cnt} rows`);
    } catch (e) {
      // Table may not exist yet
    }
  }

  db.close();
  console.log('\n✓ Cleanup complete! All dummy data wiped. Configuration and employee mappings preserved.');
} catch (err) {
  console.error('[Clear] Error wiping database:', err);
  process.exit(1);
}
