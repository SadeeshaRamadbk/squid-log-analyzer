import type Database from 'better-sqlite3';

export function initializeDatabase(db: Database.Database): void {
  // Enforce WAL mode and optimal SQLite performance settings
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

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

    -- Required indexes: time, client IP, domain
    CREATE INDEX IF NOT EXISTS idx_raw_logs_timestamp ON raw_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_client_ip ON raw_logs(client_ip);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_domain ON raw_logs(domain);
    CREATE INDEX IF NOT EXISTS idx_raw_logs_blocked ON raw_logs(is_blocked, timestamp DESC);

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

    -- Required indexes on summary table
    CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
    CREATE INDEX IF NOT EXISTS idx_daily_summaries_client_ip ON daily_summaries(client_ip);
    CREATE INDEX IF NOT EXISTS idx_daily_summaries_domain ON daily_summaries(domain);

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
  `);
}
