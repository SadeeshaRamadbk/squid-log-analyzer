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
  db.pragma('busy_timeout = 10000');

  // 1. Create syslog_events table and indexes
  db.exec(`
    CREATE TABLE IF NOT EXISTS syslog_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      facility INTEGER NOT NULL,
      facility_label TEXT NOT NULL,
      severity INTEGER NOT NULL,
      severity_label TEXT NOT NULL,
      hostname TEXT NOT NULL,
      app_name TEXT NOT NULL,
      proc_id TEXT,
      message TEXT NOT NULL,
      raw_message TEXT,
      action TEXT,
      interface TEXT,
      direction TEXT,
      protocol TEXT,
      src_ip TEXT,
      dst_ip TEXT,
      src_port INTEGER,
      dst_port INTEGER,
      tcp_flags TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_syslog_timestamp ON syslog_events(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_severity_ts ON syslog_events(severity, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_app_ts ON syslog_events(app_name, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_facility_ts ON syslog_events(facility_label, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_host_app_ts ON syslog_events(hostname, app_name, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_action_ts ON syslog_events(action, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_src_ip_ts ON syslog_events(src_ip, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_dst_ip_ts ON syslog_events(dst_ip, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_syslog_dst_port_ts ON syslog_events(dst_port, timestamp DESC);
  `);
  console.log('✓ syslog_events table and indexes verified/created.');

  // 2. Ensure security_alerts columns & indexes exist
  const alertCols = db.pragma('table_info(security_alerts)');
  if (alertCols && alertCols.length > 0) {
    const colNames = alertCols.map((c) => c.name);
    if (!colNames.includes('snoozed_until')) {
      db.exec('ALTER TABLE security_alerts ADD COLUMN snoozed_until INTEGER;');
      console.log('✓ Added column snoozed_until to security_alerts');
    }
    if (!colNames.includes('employee_name')) {
      db.exec('ALTER TABLE security_alerts ADD COLUMN employee_name TEXT;');
      console.log('✓ Added column employee_name to security_alerts');
    }
    if (!colNames.includes('group_key')) {
      db.exec('ALTER TABLE security_alerts ADD COLUMN group_key TEXT;');
      console.log('✓ Added column group_key to security_alerts');
    }
    if (!colNames.includes('occurrence_count')) {
      db.exec('ALTER TABLE security_alerts ADD COLUMN occurrence_count INTEGER NOT NULL DEFAULT 1;');
      console.log('✓ Added column occurrence_count to security_alerts');
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_alerts_group ON security_alerts(group_key, status);
      CREATE INDEX IF NOT EXISTS idx_alerts_snooze ON security_alerts(snoozed_until);
    `);
    console.log('✓ security_alerts indexes verified.');
  }

  // 3. Performance composite indexes for large-scale databases (multi-million rows)
  console.log('Creating composite performance indexes...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_client_covering ON daily_summaries(client_ip, request_count, bytes, blocked_count);
    CREATE INDEX IF NOT EXISTS idx_daily_client_domain_req ON daily_summaries(client_ip, domain, request_count);
    CREATE INDEX IF NOT EXISTS idx_netflow_daily_src_metrics ON netflow_daily_summaries(src_ip, bytes, flow_count);
    CREATE INDEX IF NOT EXISTS idx_netflow_daily_dst_metrics ON netflow_daily_summaries(dst_ip, bytes, flow_count);
    CREATE INDEX IF NOT EXISTS idx_netflow_daily_src_svc_bytes ON netflow_daily_summaries(src_ip, service_name, bytes);
    CREATE INDEX IF NOT EXISTS idx_syslog_src_action ON syslog_events(src_ip, action);
  `);
  console.log('✓ Composite performance indexes verified/created.');

  db.close();
  console.log('\nMigration completed successfully! Ready for collector insertion.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
