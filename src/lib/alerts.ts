import { getDatabase } from './db';
import { formatBytes } from './formatters';

export interface SecurityAlert {
  id: number;
  timestamp: number;
  type: 'blocked_spike' | 'high_upload' | 'new_device' | 'fan_out' | 'blocked_category';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sourceIp: string | null;
  target: string | null;
  status: 'active' | 'acknowledged' | 'dismissed';
  acknowledgedAt?: number;
}

/**
 * Scan database logs to evaluate anomaly rules and generate alerts
 */
export function evaluateSecurityRules(): SecurityAlert[] {
  const db = getDatabase();
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  const fifteenMinutesAgo = now - 15 * 60 * 1000;

  // 1. Blocked Request Spike rule: > 10 blocked requests in 10 minutes
  try {
    const spikeRows = db.prepare(`
      SELECT client_ip, COUNT(*) as cnt
      FROM raw_logs
      WHERE timestamp >= ? AND is_blocked = 1
      GROUP BY client_ip
      HAVING cnt >= 10
    `).all(tenMinutesAgo) as any[];

    for (const row of spikeRows) {
      const exists = db.prepare(`
        SELECT id FROM security_alerts
        WHERE type = 'blocked_spike' AND source_ip = ? AND timestamp >= ?
      `).get(row.client_ip, tenMinutesAgo);

      if (!exists) {
        db.prepare(`
          INSERT INTO security_alerts (timestamp, type, severity, title, description, source_ip, status)
          VALUES (?, 'blocked_spike', 'high', 'Blocked Request Spike', ?, ?, 'active')
        `).run(
          now,
          `Client generated ${row.cnt} blocked requests in the last 10 minutes.`,
          row.client_ip
        );
      }
    }
  } catch (err) {
    console.warn('Spike rule evaluation error:', err);
  }

  // 2. High Upload Volume rule: > 50 MB uploaded in 15 min
  try {
    const uploadThreshold = 50 * 1024 * 1024; // 50 MB
    const uploadRows = db.prepare(`
      SELECT src_ip, SUM(bytes) as total_upload
      FROM netflow_logs
      WHERE timestamp >= ?
      GROUP BY src_ip
      HAVING total_upload >= ?
    `).all(fifteenMinutesAgo, uploadThreshold) as any[];

    for (const row of uploadRows) {
      const exists = db.prepare(`
        SELECT id FROM security_alerts
        WHERE type = 'high_upload' AND source_ip = ? AND timestamp >= ?
      `).get(row.src_ip, fifteenMinutesAgo);

      if (!exists) {
        db.prepare(`
          INSERT INTO security_alerts (timestamp, type, severity, title, description, source_ip, status)
          VALUES (?, 'high_upload', 'critical', 'High Outbound Upload Spike', ?, ?, 'active')
        `).run(
          now,
          `Host uploaded ${formatBytes(row.total_upload)} in the last 15 minutes, exceeding safety threshold.`,
          row.src_ip
        );
      }
    }
  } catch (err) {
    console.warn('Upload rule evaluation error:', err);
  }

  // 3. High Fan-Out (contacting > 30 unique external IPs quickly)
  try {
    const fanoutRows = db.prepare(`
      SELECT src_ip, COUNT(DISTINCT dst_ip) as unique_targets
      FROM netflow_logs
      WHERE timestamp >= ?
      GROUP BY src_ip
      HAVING unique_targets >= 30
    `).all(fifteenMinutesAgo) as any[];

    for (const row of fanoutRows) {
      const exists = db.prepare(`
        SELECT id FROM security_alerts
        WHERE type = 'fan_out' AND source_ip = ? AND timestamp >= ?
      `).get(row.src_ip, fifteenMinutesAgo);

      if (!exists) {
        db.prepare(`
          INSERT INTO security_alerts (timestamp, type, severity, title, description, source_ip, status)
          VALUES (?, 'fan_out', 'medium', 'Rapid External Fan-Out (Reconnaissance)', ?, ?, 'active')
        `).run(
          now,
          `Host contacted ${row.unique_targets} distinct remote IP endpoints within 15 minutes.`,
          row.src_ip
        );
      }
    }
  } catch (err) {
    console.warn('Fan-out rule evaluation error:', err);
  }

  // Return active/recent alerts
  const alertRows = db.prepare(`
    SELECT id, timestamp, type, severity, title, description, source_ip, target, status, acknowledged_at
    FROM security_alerts
    ORDER BY timestamp DESC
    LIMIT 50
  `).all() as any[];

  return alertRows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    type: r.type,
    severity: r.severity,
    title: r.title,
    description: r.description,
    sourceIp: r.source_ip,
    target: r.target,
    status: r.status,
    acknowledgedAt: r.acknowledged_at,
  }));
}

export function updateAlertStatus(id: number, status: 'acknowledged' | 'dismissed'): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE security_alerts
    SET status = ?, acknowledged_at = ?
    WHERE id = ?
  `).run(status, Date.now(), id);
}
