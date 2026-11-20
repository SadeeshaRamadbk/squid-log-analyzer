const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = process.env.DATABASE_PATH || './data/squid_analytics.db';
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/^DATABASE_PATH\s*=\s*(.+)$/m);
  if (match) {
    dbPath = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
console.log(`Connecting to SQLite at: ${resolvedPath}`);

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 30000');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

const indexes = [
  { name: 'idx_daily_client_covering', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_client_covering ON daily_summaries(client_ip, request_count, bytes, blocked_count);' },
  { name: 'idx_daily_client_domain_req', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_client_domain_req ON daily_summaries(client_ip, domain, request_count);' },
  { name: 'idx_netflow_daily_src_metrics', sql: 'CREATE INDEX IF NOT EXISTS idx_netflow_daily_src_metrics ON netflow_daily_summaries(src_ip, bytes, flow_count);' },
  { name: 'idx_netflow_daily_dst_metrics', sql: 'CREATE INDEX IF NOT EXISTS idx_netflow_daily_dst_metrics ON netflow_daily_summaries(dst_ip, bytes, flow_count);' },
  { name: 'idx_netflow_daily_src_svc_bytes', sql: 'CREATE INDEX IF NOT EXISTS idx_netflow_daily_src_svc_bytes ON netflow_daily_summaries(src_ip, service_name, bytes);' },
  { name: 'idx_syslog_src_action', sql: 'CREATE INDEX IF NOT EXISTS idx_syslog_src_action ON syslog_events(src_ip, action);' },
];

console.log('Applying performance indexes...');
for (const idx of indexes) {
  const t0 = Date.now();
  try {
    process.stdout.write(`Creating ${idx.name}... `);
    db.exec(idx.sql);
    console.log(`✓ done (${Date.now() - t0}ms)`);
  } catch (err) {
    console.log(`FAILED (${err.message})`);
  }
}

db.close();
console.log('All performance indexes successfully created!');
