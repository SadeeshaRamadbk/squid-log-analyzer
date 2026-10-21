import type Database from 'better-sqlite3';
import { seedDefaultUsers } from '../auth';

export function initializeDatabase(db: Database.Database): void {
  // Enforce WAL mode and optimal SQLite performance settings for multi-GB scale
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 10000');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -64000'); // 64 MB memory page cache (replaces default ~2MB)
  db.pragma('mmap_size = 1073741824'); // 1 GB memory-mapped I/O for direct OS file caching
  db.pragma('temp_store = MEMORY'); // Keep temporary tables, sorting, and GROUP BY in RAM

  // Create raw logs table
  // Requirement: Store full URL only for blocked requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,            -- Unix epoch in milliseconds
      client_ip TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT,                              -- NULL for allowed; stored ONLY for blocked
      domain TEXT NOT NULL,
      result_code TEXT NOT NULL,             -- e.g. 'TCP_DENIED/403', 'TCP_MISS/200'
      is_blocked INTEGER NOT NULL DEFAULT 0, -- 1 = blocked, 0 = allowed
      bytes INTEGER NOT NULL DEFAULT 0
    );

    -- Primary single-column and composite indexes for raw_logs (multi-GB fast queries)
    CREATE INDEX IF NOT EXISTS idx_raw_logs_timestamp ON raw_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_client_ip ON raw_logs(client_ip);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_domain ON raw_logs(domain);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_blocked ON raw_logs(is_blocked, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_ts_ip ON raw_logs(timestamp, client_ip);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_ip_ts ON raw_logs(client_ip, timestamp);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_ts_domain_bytes ON raw_logs(timestamp, domain, bytes, is_blocked);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_ts_client_bytes ON raw_logs(timestamp, client_ip, bytes, is_blocked);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_ip_ts_desc ON raw_logs(client_ip, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_blocked_ts_ip ON raw_logs(is_blocked, timestamp DESC, client_ip);

    -- Required daily summary table: (date, client IP, domain, request count, bytes)
    CREATE TABLE IF NOT EXISTS daily_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
      client_ip TEXT NOT NULL,
      domain TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      blocked_count INTEGER NOT NULL DEFAULT 0,
      bytes INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT uq_daily_ip_domain UNIQUE(date, client_ip, domain)
    );

    -- Indexes on summary table (single and composite)
    CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
    CREATE INDEX IF NOT EXISTS idx_daily_summaries_client_ip ON daily_summaries(client_ip);
    CREATE INDEX IF NOT EXISTS idx_daily_summaries_domain ON daily_summaries(domain);
    CREATE INDEX IF NOT EXISTS idx_daily_date_ip ON daily_summaries(date, client_ip);
    CREATE INDEX IF NOT EXISTS idx_daily_ip_date ON daily_summaries(client_ip, date);
    CREATE INDEX IF NOT EXISTS idx_daily_domain_date ON daily_summaries(domain, date);

    -- Metadata tracking table for retention and ingestion status
    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- User / Host mapping for internal client IPs (nipponbpo.local)
    CREATE TABLE IF NOT EXISTS ip_mappings (
      client_ip TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      department TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ip_mappings_user ON ip_mappings(user_name);

    -- pfSense softflowd 1.2.6_4 Layer 3/4 Flow Records
    CREATE TABLE IF NOT EXISTS netflow_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,          -- Unix epoch in ms
      src_ip TEXT NOT NULL,
      dst_ip TEXT NOT NULL,
      src_port INTEGER NOT NULL,
      dst_port INTEGER NOT NULL,
      protocol TEXT NOT NULL,              -- 'TCP', 'UDP', 'ICMP', etc.
      service_name TEXT,                   -- 'HTTPS', 'DNS', 'SSH', 'RDP', etc.
      bytes INTEGER NOT NULL DEFAULT 0,
      packets INTEGER NOT NULL DEFAULT 0,
      tcp_flags TEXT,                      -- 'SYN', 'ACK', 'FIN', etc.
      flow_duration_ms INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_netflow_timestamp ON netflow_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_netflow_src_ip ON netflow_logs(src_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_dst_ip ON netflow_logs(dst_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_dst_port ON netflow_logs(dst_port);
    CREATE INDEX IF NOT EXISTS idx_netflow_protocol ON netflow_logs(protocol);
    CREATE INDEX IF NOT EXISTS idx_netflow_ts_src ON netflow_logs(timestamp, src_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_ts_dst ON netflow_logs(timestamp, dst_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_src_ts ON netflow_logs(src_ip, timestamp);
    CREATE INDEX IF NOT EXISTS idx_netflow_dst_ts ON netflow_logs(dst_ip, timestamp);

    -- Daily aggregate summaries for softflowd
    CREATE TABLE IF NOT EXISTS netflow_daily_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,                  -- 'YYYY-MM-DD'
      src_ip TEXT NOT NULL,
      dst_ip TEXT NOT NULL,
      dst_port INTEGER NOT NULL,
      protocol TEXT NOT NULL,
      service_name TEXT,
      flow_count INTEGER NOT NULL DEFAULT 0,
      bytes INTEGER NOT NULL DEFAULT 0,
      packets INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT uq_netflow_daily UNIQUE(date, src_ip, dst_ip, dst_port, protocol)
    );

    CREATE INDEX IF NOT EXISTS idx_netflow_daily_date ON netflow_daily_summaries(date);
    CREATE INDEX IF NOT EXISTS idx_netflow_daily_src ON netflow_daily_summaries(src_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_daily_dst ON netflow_daily_summaries(dst_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_daily_port ON netflow_daily_summaries(dst_port);

    -- Domain Categories table for URL classification & noise reduction
    CREATE TABLE IF NOT EXISTS domain_categories (
      domain TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_domain_cat ON domain_categories(category);

    -- Security alerts & anomaly detections
    CREATE TABLE IF NOT EXISTS security_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      source_ip TEXT,
      target TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      acknowledged_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_time ON security_alerts(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON security_alerts(status);

    -- Reverse DNS & GeoIP/ASN enrichment cache with TTL
    CREATE TABLE IF NOT EXISTS ip_enrichment (
      ip TEXT PRIMARY KEY,
      hostname TEXT,
      org TEXT,
      country TEXT,
      city TEXT,
      asn TEXT,
      updated_at INTEGER NOT NULL,
      ttl_seconds INTEGER NOT NULL DEFAULT 86400
    );

    -- Blocklist & Full Access policy management
    CREATE TABLE IF NOT EXISTS access_control_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      target TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      comment TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Access Control Audit Log
    CREATE TABLE IF NOT EXISTS access_control_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT 'admin',
      reason TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_time ON access_control_audit(timestamp DESC);

    -- Scheduled Report configurations & history
    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      schedule TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run INTEGER,
      last_report_path TEXT,
      updated_at INTEGER NOT NULL
    );

    -- Performance: Minute roll-up tables for softflowd telemetry
    CREATE TABLE IF NOT EXISTS netflow_minute_rollups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bucket_timestamp INTEGER NOT NULL,
      src_ip TEXT NOT NULL,
      dst_ip TEXT NOT NULL,
      dst_port INTEGER NOT NULL,
      protocol TEXT NOT NULL,
      service_name TEXT,
      flow_count INTEGER NOT NULL DEFAULT 0,
      bytes INTEGER NOT NULL DEFAULT 0,
      packets INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT uq_netflow_min UNIQUE(bucket_timestamp, src_ip, dst_ip, dst_port, protocol)
    );
    CREATE INDEX IF NOT EXISTS idx_netflow_min_time ON netflow_minute_rollups(bucket_timestamp);
    CREATE INDEX IF NOT EXISTS idx_netflow_min_src ON netflow_minute_rollups(src_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_min_dst ON netflow_minute_rollups(dst_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_min_port ON netflow_minute_rollups(dst_port);
    CREATE INDEX IF NOT EXISTS idx_netflow_min_ts_src ON netflow_minute_rollups(bucket_timestamp, src_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_min_ts_dst ON netflow_minute_rollups(bucket_timestamp, dst_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_min_src_ts ON netflow_minute_rollups(src_ip, bucket_timestamp);
    CREATE INDEX IF NOT EXISTS idx_netflow_min_dst_ts ON netflow_minute_rollups(dst_ip, bucket_timestamp);

    -- Performance: Hourly roll-up tables for long-term charts and reporting
    CREATE TABLE IF NOT EXISTS netflow_hourly_rollups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bucket_timestamp INTEGER NOT NULL,
      src_ip TEXT NOT NULL,
      dst_ip TEXT NOT NULL,
      dst_port INTEGER NOT NULL,
      protocol TEXT NOT NULL,
      service_name TEXT,
      flow_count INTEGER NOT NULL DEFAULT 0,
      bytes INTEGER NOT NULL DEFAULT 0,
      packets INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT uq_netflow_hr UNIQUE(bucket_timestamp, src_ip, dst_ip, dst_port, protocol)
    );
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_time ON netflow_hourly_rollups(bucket_timestamp);
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_src ON netflow_hourly_rollups(src_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_dst ON netflow_hourly_rollups(dst_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_port ON netflow_hourly_rollups(dst_port);
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_ts_src ON netflow_hourly_rollups(bucket_timestamp, src_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_ts_dst ON netflow_hourly_rollups(bucket_timestamp, dst_ip);
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_src_ts ON netflow_hourly_rollups(src_ip, bucket_timestamp);
    CREATE INDEX IF NOT EXISTS idx_netflow_hr_dst_ts ON netflow_hourly_rollups(dst_ip, bucket_timestamp);

    -- Security: Local user accounts & roles
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer', -- 'admin' or 'viewer'
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    -- Security: Active session tokens
    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
  `);

  // Backfill minute and hourly rollups from existing raw logs if empty
  try {
    const hasMinRollup = db.prepare('SELECT 1 FROM netflow_minute_rollups LIMIT 1').get();
    if (!hasMinRollup) {
      const hasRawLogs = db.prepare('SELECT 1 FROM netflow_logs LIMIT 1').get();
      if (hasRawLogs) {
        db.prepare(`
          INSERT OR IGNORE INTO netflow_minute_rollups (
            bucket_timestamp, src_ip, dst_ip, dst_port, protocol, service_name, flow_count, bytes, packets
          )
          SELECT
            CAST((timestamp / 60000) AS INTEGER) * 60000 AS bucket_timestamp,
            src_ip, dst_ip, dst_port, protocol, service_name,
            COUNT(*) AS flow_count,
            SUM(bytes) AS bytes,
            SUM(packets) AS packets
          FROM netflow_logs
          GROUP BY CAST((timestamp / 60000) AS INTEGER) * 60000, src_ip, dst_ip, dst_port, protocol
        `).run();

        db.prepare(`
          INSERT OR IGNORE INTO netflow_hourly_rollups (
            bucket_timestamp, src_ip, dst_ip, dst_port, protocol, service_name, flow_count, bytes, packets
          )
          SELECT
            CAST((timestamp / 3600000) AS INTEGER) * 3600000 AS bucket_timestamp,
            src_ip, dst_ip, dst_port, protocol, service_name,
            COUNT(*) AS flow_count,
            SUM(bytes) AS bytes,
            SUM(packets) AS packets
          FROM netflow_logs
          GROUP BY CAST((timestamp / 3600000) AS INTEGER) * 3600000, src_ip, dst_ip, dst_port, protocol
        `).run();
      }
    }
  } catch (e) {
    console.warn('[Schema] Roll-up migration warning:', e);
  }

  // Seed default admin and viewer accounts
  try {
    seedDefaultUsers(db);
  } catch (e) {
    console.warn('[Schema] User seed warning:', e);
  }
}

