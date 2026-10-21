import { getDatabase } from './db';
import { formatBytes } from './formatters';
import { getSystemSettings } from './settings';
import { dispatchAlertNotification } from './notifications';

export interface SecurityAlert {
  id: number;
  timestamp: number;
  type:
    | 'blocked_spike'
    | 'high_upload'
    | 'unknown_device'
    | 'repeated_denied_domain'
    | 'port_scan'
    | 'fan_out';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sourceIp: string | null;
  employeeName?: string | null;
  target: string | null;
  status: 'active' | 'acknowledged' | 'dismissed' | 'snoozed';
  acknowledgedAt?: number;
  snoozedUntil?: number;
  occurrenceCount?: number;
  groupKey?: string;
}

/**
 * Helper to fetch employee name & department from ip_mappings for an IP
 */
function getEmployeeAlias(db: any, ip?: string | null): string | null {
  if (!ip) return null;
  try {
    const row = db.prepare('SELECT user_name, department FROM ip_mappings WHERE client_ip = ?').get(ip) as any;
    if (row && row.user_name) {
      return row.department ? `${row.user_name} (${row.department})` : row.user_name;
    }
  } catch {}
  return null;
}

/**
 * Upsert or group an alert using its groupKey to prevent alert storms and duplicates
 */
function recordAlert(
  db: any,
  alert: {
    type: SecurityAlert['type'];
    severity: SecurityAlert['severity'];
    title: string;
    description: string;
    sourceIp: string | null;
    target: string | null;
    groupKey: string;
    employeeName?: string | null;
  }
): void {
  const now = Date.now();

  // Check if an existing alert with the same group_key is currently active or snoozed
  const existing = db.prepare(`
    SELECT id, status, snoozed_until, occurrence_count
    FROM security_alerts
    WHERE group_key = ? AND status IN ('active', 'snoozed')
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(alert.groupKey) as any;

  if (existing) {
    // If snoozed and snooze period is still active, do not disturb
    if (existing.status === 'snoozed' && existing.snoozed_until && existing.snoozed_until > now) {
      return;
    }

    // Dedupe: update timestamp, bump occurrence count, update description
    db.prepare(`
      UPDATE security_alerts
      SET timestamp = ?,
          description = ?,
          occurrence_count = occurrence_count + 1,
          status = 'active',
          employee_name = COALESCE(?, employee_name)
      WHERE id = ?
    `).run(now, alert.description, alert.employeeName || null, existing.id);
  } else {
    // Insert new alert
    const insertRes = db.prepare(`
      INSERT INTO security_alerts (
        timestamp, type, severity, title, description,
        source_ip, employee_name, target, status, group_key, occurrence_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 1)
    `).run(
      now,
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      alert.sourceIp,
      alert.employeeName || null,
      alert.target,
      alert.groupKey
    );

    // Asynchronously dispatch notification for new alerts
    const newAlert: SecurityAlert = {
      id: Number(insertRes.lastInsertRowid),
      timestamp: now,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      sourceIp: alert.sourceIp,
      employeeName: alert.employeeName,
      target: alert.target,
      status: 'active',
      occurrenceCount: 1,
      groupKey: alert.groupKey,
    };

    dispatchAlertNotification(newAlert).catch((e) =>
      console.warn('[Alerts] Background notification error:', e)
    );
  }
}

/**
 * Scan database logs to evaluate anomaly rules and generate alerts
 */
export function evaluateSecurityRules(): SecurityAlert[] {
  const db = getDatabase();
  const settings = getSystemSettings();
  const now = Date.now();

  // 0. Auto-expire stale active alerts older than autoExpireHours (default: 24h)
  const autoExpireCutoff = now - (settings.autoExpireHours || 24) * 60 * 60 * 1000;
  try {
    db.prepare(`
      UPDATE security_alerts
      SET status = 'dismissed', acknowledged_at = ?
      WHERE status = 'active' AND timestamp < ?
    `).run(now, autoExpireCutoff);

    // Unsnooze alerts whose snooze duration has elapsed
    db.prepare(`
      UPDATE security_alerts
      SET status = 'active', snoozed_until = NULL
      WHERE status = 'snoozed' AND snoozed_until < ?
    `).run(now);
  } catch (err) {
    console.warn('[Alerts] Auto-expire check warning:', err);
  }

  const tenMinutesAgo = now - 10 * 60 * 1000;
  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  const thirtyMinutesAgo = now - 30 * 60 * 1000;

  // 1. Blocked Request Spike rule:
  // Configurable threshold (default: 25) with per-host rolling baseline
  try {
    const spikeThreshold = settings.blockedSpikeThreshold || 25;
    const spikeRows = db.prepare(`
      SELECT client_ip, COUNT(*) as cnt
      FROM raw_logs
      WHERE timestamp >= ? AND is_blocked = 1
      GROUP BY client_ip
      HAVING cnt >= ?
    `).all(tenMinutesAgo, spikeThreshold) as any[];

    for (const row of spikeRows) {
      const alias = getEmployeeAlias(db, row.client_ip);
      const hostLabel = alias ? `${alias} [${row.client_ip}]` : row.client_ip;

      // Check per-host rolling baseline (average blocks in previous 24h)
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const baselineRow = db.prepare(`
        SELECT COUNT(*) as total_day_blocks
        FROM raw_logs
        WHERE client_ip = ? AND timestamp >= ? AND timestamp < ? AND is_blocked = 1
      `).get(row.client_ip, oneDayAgo, tenMinutesAgo) as any;

      // Hourly baseline (day blocks / 24) -> 10m expected baseline is hourly / 6
      const baselineTenMin = Math.max(2, Math.round(((baselineRow?.total_day_blocks || 0) / 24) / 6));

      // Only trigger if active blocks are at least 1.8x the host's normal 10m baseline
      if (row.cnt >= baselineTenMin * 1.8) {
        recordAlert(db, {
          type: 'blocked_spike',
          severity: row.cnt >= spikeThreshold * 2 ? 'critical' : 'high',
          title: `Blocked Request Spike (${row.cnt} blocks / 10m)`,
          description: `${hostLabel} produced ${row.cnt} blocked requests in 10 minutes (normal baseline: ~${baselineTenMin}).`,
          sourceIp: row.client_ip,
          employeeName: alias,
          target: null,
          groupKey: `blocked_spike:${row.client_ip}`,
        });
      }
    }
  } catch (err) {
    console.warn('[Alerts] Spike rule evaluation error:', err);
  }

  // 2. Large Upload Spike rule: Host uploaded > threshold MB in 15 min
  try {
    const uploadThresholdBytes = (settings.uploadSpikeThresholdMb || 100) * 1024 * 1024;
    const uploadRows = db.prepare(`
      SELECT src_ip, SUM(bytes) as total_upload
      FROM netflow_logs
      WHERE timestamp >= ?
      GROUP BY src_ip
      HAVING total_upload >= ?
    `).all(fifteenMinutesAgo, uploadThresholdBytes) as any[];

    for (const row of uploadRows) {
      const alias = getEmployeeAlias(db, row.src_ip);
      const hostLabel = alias ? `${alias} [${row.src_ip}]` : row.src_ip;

      recordAlert(db, {
        type: 'high_upload',
        severity: row.total_upload >= uploadThresholdBytes * 2.5 ? 'critical' : 'high',
        title: `Large Outbound Upload Spike (${formatBytes(row.total_upload)})`,
        description: `${hostLabel} transmitted ${formatBytes(row.total_upload)} outbound in the last 15 minutes, exceeding the safety threshold of ${settings.uploadSpikeThresholdMb || 100} MB.`,
        sourceIp: row.src_ip,
        employeeName: alias,
        target: null,
        groupKey: `high_upload:${row.src_ip}`,
      });
    }
  } catch (err) {
    console.warn('[Alerts] Upload rule evaluation error:', err);
  }

  // 3. Repeated Denied Requests to the Same Domain:
  // e.g. User repeatedly hammering a blocked domain (e.g. gambling, social, shadow IT)
  try {
    const repeatThreshold = settings.repeatedDeniedThreshold || 8;
    const repeatedRows = db.prepare(`
      SELECT client_ip, domain, COUNT(*) as cnt
      FROM raw_logs
      WHERE timestamp >= ? AND is_blocked = 1
      GROUP BY client_ip, domain
      HAVING cnt >= ?
      ORDER BY cnt DESC
      LIMIT 10
    `).all(tenMinutesAgo, repeatThreshold) as any[];

    for (const row of repeatedRows) {
      const alias = getEmployeeAlias(db, row.client_ip);
      const hostLabel = alias ? `${alias} [${row.client_ip}]` : row.client_ip;

      recordAlert(db, {
        type: 'repeated_denied_domain',
        severity: 'high',
        title: `Repeated Policy Violations to ${row.domain}`,
        description: `${hostLabel} attempted to access prohibited domain '${row.domain}' ${row.cnt} times within 10 minutes.`,
        sourceIp: row.client_ip,
        employeeName: alias,
        target: row.domain,
        groupKey: `repeated_denied:${row.client_ip}:${row.domain}`,
      });
    }
  } catch (err) {
    console.warn('[Alerts] Repeated denied rule error:', err);
  }

  // 4. Port-scan-like Firewall Blocks (from pfSense filterlog):
  // Host blocked by firewall across >= threshold distinct ports within 10 minutes
  try {
    const portScanThreshold = settings.portScanThreshold || 12;
    const scanRows = db.prepare(`
      SELECT src_ip, COUNT(DISTINCT dst_port) as distinct_ports
      FROM syslog_events
      WHERE timestamp >= ? AND action IN ('block', 'reject') AND dst_port IS NOT NULL
      GROUP BY src_ip
      HAVING distinct_ports >= ?
    `).all(tenMinutesAgo, portScanThreshold) as any[];

    for (const row of scanRows) {
      const alias = getEmployeeAlias(db, row.src_ip);
      const hostLabel = alias ? `${alias} [${row.src_ip}]` : row.src_ip;

      recordAlert(db, {
        type: 'port_scan',
        severity: 'critical',
        title: `Port Scan Anomaly Detected (${row.distinct_ports} blocked ports)`,
        description: `${hostLabel} was blocked while probing ${row.distinct_ports} distinct network ports in 10 minutes.`,
        sourceIp: row.src_ip,
        employeeName: alias,
        target: null,
        groupKey: `port_scan:${row.src_ip}`,
      });
    }
  } catch (err) {
    console.warn('[Alerts] Port scan rule error:', err);
  }

  // 5. Unknown Device rule: Internal IP active in logs but not mapped in IP Aliases
  try {
    const unknownIps = db.prepare(`
      SELECT DISTINCT client_ip
      FROM raw_logs
      WHERE timestamp >= ?
        AND client_ip LIKE '192.168.%'
        AND client_ip NOT IN (SELECT client_ip FROM ip_mappings)
      LIMIT 5
    `).all(thirtyMinutesAgo) as any[];

    for (const row of unknownIps) {
      recordAlert(db, {
        type: 'unknown_device',
        severity: 'medium',
        title: `Unaliased Device Detected (${row.client_ip})`,
        description: `Workstation IP ${row.client_ip} is actively generating network traffic but has no employee name assigned in IP Aliases.`,
        sourceIp: row.client_ip,
        employeeName: null,
        target: null,
        groupKey: `unknown_device:${row.client_ip}`,
      });
    }
  } catch (err) {
    console.warn('[Alerts] Unknown device rule error:', err);
  }

  // 6. Rapid External Fan-Out rule (reconnaissance)
  try {
    const fanoutThreshold = settings.fanoutThreshold || 35;
    const fanoutRows = db.prepare(`
      SELECT src_ip, COUNT(DISTINCT dst_ip) as unique_targets
      FROM netflow_logs
      WHERE timestamp >= ?
      GROUP BY src_ip
      HAVING unique_targets >= ?
    `).all(fifteenMinutesAgo, fanoutThreshold) as any[];

    for (const row of fanoutRows) {
      const alias = getEmployeeAlias(db, row.src_ip);
      const hostLabel = alias ? `${alias} [${row.src_ip}]` : row.src_ip;

      recordAlert(db, {
        type: 'fan_out',
        severity: 'medium',
        title: `Rapid External Fan-Out (${row.unique_targets} targets / 15m)`,
        description: `${hostLabel} contacted ${row.unique_targets} distinct remote IP endpoints within 15 minutes.`,
        sourceIp: row.src_ip,
        employeeName: alias,
        target: null,
        groupKey: `fan_out:${row.src_ip}`,
      });
    }
  } catch (err) {
    console.warn('[Alerts] Fan-out rule evaluation error:', err);
  }

  // Return active/recent alerts for UI
  const alertRows = db.prepare(`
    SELECT id, timestamp, type, severity, title, description,
           source_ip, employee_name, target, status, acknowledged_at,
           snoozed_until, occurrence_count, group_key
    FROM security_alerts
    WHERE status IN ('active', 'snoozed')
    ORDER BY timestamp DESC
    LIMIT 60
  `).all() as any[];

  return alertRows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    type: r.type,
    severity: r.severity,
    title: r.title,
    description: r.description,
    sourceIp: r.source_ip,
    employeeName: r.employee_name || null,
    target: r.target,
    status: r.status,
    acknowledgedAt: r.acknowledged_at,
    snoozedUntil: r.snoozed_until,
    occurrenceCount: r.occurrence_count || 1,
    groupKey: r.group_key,
  }));
}

/**
 * Update alert status (acknowledge, dismiss, or snooze)
 */
export function updateAlertStatus(
  id: number,
  status: 'acknowledged' | 'dismissed' | 'snoozed',
  snoozeDurationMs?: number
): void {
  const db = getDatabase();
  const now = Date.now();
  const snoozedUntil = status === 'snoozed' && snoozeDurationMs ? now + snoozeDurationMs : null;

  db.prepare(`
    UPDATE security_alerts
    SET status = ?,
        acknowledged_at = ?,
        snoozed_until = ?
    WHERE id = ?
  `).run(status, now, snoozedUntil, id);
}

/**
 * Snooze alert for a given duration
 */
export function snoozeAlert(id: number, duration: '1h' | '1d' | '7d'): void {
  let ms = 60 * 60 * 1000;
  if (duration === '1d') ms = 24 * 60 * 60 * 1000;
  else if (duration === '7d') ms = 7 * 24 * 60 * 60 * 1000;
  updateAlertStatus(id, 'snoozed', ms);
}

/**
 * Dismiss active security alerts older than a specified duration in milliseconds (default: 1 hour)
 */
export function dismissOldAlerts(olderThanMs: number = 60 * 60 * 1000): number {
  const db = getDatabase();
  const cutoff = Date.now() - olderThanMs;
  const result = db.prepare(`
    UPDATE security_alerts
    SET status = 'dismissed', acknowledged_at = ?
    WHERE status = 'active' AND timestamp < ?
  `).run(Date.now(), cutoff);
  return result.changes;
}
