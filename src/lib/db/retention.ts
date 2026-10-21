import { getDatabase } from './index';

export interface RetentionResult {
  deletedRows: number;
  squidDeletedRows: number;
  netflowDeletedRows: number;
  syslogDeletedRows?: number;
  minuteRollupsDeletedRows: number;
  hourlyRollupsDeletedRows: number;
  squidRetentionDays: number;
  netflowRetentionDays: number;
  syslogRetentionDays?: number;
  cutoffDate: string;
  cutoffTimestamp: number;
  executedAt: string;
  walCheckpointResult?: any;
}

export interface RetentionOptions {
  squidDays?: number;
  netflowDays?: number;
  syslogDays?: number;
  minuteRollupDays?: number;
  hourlyRollupDays?: number;
  runVacuum?: boolean;
}

export function runRetentionJob(options: RetentionOptions | number = {}): RetentionResult {
  const db = getDatabase();
  
  const opts: RetentionOptions = typeof options === 'number' 
    ? { squidDays: options, netflowDays: 7 } 
    : options;

  const squidDays = opts.squidDays ?? Number(process.env.RETENTION_DAYS) ?? 60;
  const netflowDays = opts.netflowDays ?? Number(process.env.NETFLOW_RETENTION_DAYS) ?? 7;
  const syslogDays = opts.syslogDays ?? Number(process.env.SYSLOG_RETENTION_DAYS) ?? 14;
  const minuteRollupDays = opts.minuteRollupDays ?? 14;
  const hourlyRollupDays = opts.hourlyRollupDays ?? 90;

  const now = Date.now();
  const squidCutoff = now - squidDays * 24 * 60 * 60 * 1000;
  const netflowCutoff = now - netflowDays * 24 * 60 * 60 * 1000;
  const syslogCutoff = now - syslogDays * 24 * 60 * 60 * 1000;
  const minuteRollupCutoff = now - minuteRollupDays * 24 * 60 * 60 * 1000;
  const hourlyRollupCutoff = now - hourlyRollupDays * 24 * 60 * 60 * 1000;

  console.log(`[Retention Job] Pruning logs (Squid > ${squidDays}d, NetFlow > ${netflowDays}d, Syslog > ${syslogDays}d)...`);

  let squidDeleted = 0;
  let netflowDeleted = 0;
  let syslogDeleted = 0;
  let minRollupDeleted = 0;
  let hrRollupDeleted = 0;

  const runDeletes = db.transaction(() => {
    // 1. Delete expired Squid raw logs
    const infoSquid = db.prepare('DELETE FROM raw_logs WHERE timestamp < ?').run(squidCutoff);
    squidDeleted = infoSquid.changes;

    // 2. Delete expired NetFlow raw logs (short retention: default 7 days)
    const infoNetflow = db.prepare('DELETE FROM netflow_logs WHERE timestamp < ?').run(netflowCutoff);
    netflowDeleted = infoNetflow.changes;

    // 3. Delete expired Syslog events (default 14 days)
    try {
      const infoSyslog = db.prepare('DELETE FROM syslog_events WHERE timestamp < ?').run(syslogCutoff);
      syslogDeleted = infoSyslog.changes;
    } catch {}

    // 4. Delete expired minute roll-ups (> 14 days)
    const infoMin = db.prepare('DELETE FROM netflow_minute_rollups WHERE bucket_timestamp < ?').run(minuteRollupCutoff);
    minRollupDeleted = infoMin.changes;

    // 5. Delete expired hourly roll-ups (> 90 days)
    const infoHr = db.prepare('DELETE FROM netflow_hourly_rollups WHERE bucket_timestamp < ?').run(hourlyRollupCutoff);
    hrRollupDeleted = infoHr.changes;
  });

  runDeletes();
  const totalDeleted = squidDeleted + netflowDeleted + syslogDeleted + minRollupDeleted + hrRollupDeleted;

  // Run WAL checkpoint and optimize pragma
  let walCheckpointResult = null;
  try {
    walCheckpointResult = db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.warn('[Retention Job] WAL checkpoint warning:', err);
  }

  try {
    db.pragma('optimize');
    if (opts.runVacuum) {
      db.exec('VACUUM');
    }
  } catch (err) {
    console.warn('[Retention Job] Optimize warning:', err);
  }

  // Record retention execution in metadata
  const metaStmt = db.prepare(`
    INSERT INTO system_meta (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const executionPayload = {
    deletedRows: totalDeleted,
    squidDeletedRows: squidDeleted,
    netflowDeletedRows: netflowDeleted,
    syslogDeletedRows: syslogDeleted,
    minuteRollupsDeletedRows: minRollupDeleted,
    hourlyRollupsDeletedRows: hrRollupDeleted,
    squidRetentionDays: squidDays,
    netflowRetentionDays: netflowDays,
    syslogRetentionDays: syslogDays,
    cutoffDate: new Date(netflowCutoff).toISOString(),
    cutoffTimestamp: netflowCutoff,
    executedAt: new Date().toISOString(),
  };

  metaStmt.run('last_retention_run', JSON.stringify(executionPayload), now);

  console.log(`[Retention Job] Cleaned ${totalDeleted} records total (Squid: ${squidDeleted}, NetFlow raw: ${netflowDeleted}, Syslog: ${syslogDeleted}, Minute rollups: ${minRollupDeleted}, Hourly rollups: ${hrRollupDeleted}).`);

  return {
    deletedRows: totalDeleted,
    squidDeletedRows: squidDeleted,
    netflowDeletedRows: netflowDeleted,
    syslogDeletedRows: syslogDeleted,
    minuteRollupsDeletedRows: minRollupDeleted,
    hourlyRollupsDeletedRows: hrRollupDeleted,
    squidRetentionDays: squidDays,
    netflowRetentionDays: netflowDays,
    syslogRetentionDays: syslogDays,
    cutoffDate: new Date(netflowCutoff).toISOString(),
    cutoffTimestamp: netflowCutoff,
    executedAt: new Date().toISOString(),
    walCheckpointResult,
  };
}

// Allow direct execution via CLI `npm run retention`
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  try {
    const result = runRetentionJob();
    console.log('[Retention Job] Result:', result);
    process.exit(0);
  } catch (error) {
    console.error('[Retention Job] Error:', error);
    process.exit(1);
  }
}
