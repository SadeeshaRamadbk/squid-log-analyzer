import { getDatabase } from './db';

export interface AccessRule {
  id: number;
  type: 'block_domain' | 'full_access_ip';
  target: string;
  enabled: boolean;
  comment: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AccessAuditRecord {
  id: number;
  timestamp: number;
  formattedTime: string;
  action: string;
  target: string;
  operator: string;
  reason: string | null;
}

export function getAccessControlRules(): AccessRule[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, type, target, enabled, comment, created_at, updated_at
    FROM access_control_rules
    ORDER BY updated_at DESC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    target: r.target,
    enabled: Boolean(r.enabled),
    comment: r.comment,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getAccessControlAuditLog(limit = 50): AccessAuditRecord[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, timestamp, action, target, operator, reason
    FROM access_control_audit
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    formattedTime: new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 19),
    action: r.action,
    target: r.target,
    operator: r.operator,
    reason: r.reason,
  }));
}

export function blockDomain(domain: string, operator = 'admin', reason = 'Manual block via dashboard'): void {
  const db = getDatabase();
  const clean = domain.trim().toLowerCase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO access_control_rules (type, target, enabled, comment, created_at, updated_at)
    VALUES ('block_domain', ?, 1, ?, ?, ?)
    ON CONFLICT(target) DO UPDATE SET
      type = 'block_domain',
      enabled = 1,
      comment = excluded.comment,
      updated_at = excluded.updated_at
  `).run(clean, reason, now, now);

  db.prepare(`
    INSERT INTO access_control_audit (timestamp, action, target, operator, reason)
    VALUES (?, 'block_domain', ?, ?, ?)
  `).run(now, clean, operator, reason);
}

export function unblockDomain(domain: string, operator = 'admin', reason = 'Unblocked via dashboard'): void {
  const db = getDatabase();
  const clean = domain.trim().toLowerCase();
  const now = Date.now();

  db.prepare(`
    DELETE FROM access_control_rules
    WHERE type = 'block_domain' AND target = ?
  `).run(clean);

  db.prepare(`
    INSERT INTO access_control_audit (timestamp, action, target, operator, reason)
    VALUES (?, 'unblock_domain', ?, ?, ?)
  `).run(now, clean, operator, reason);
}

export function grantFullAccessIp(ip: string, operator = 'admin', reason = 'Granted full access bypass'): void {
  const db = getDatabase();
  const clean = ip.trim();
  const now = Date.now();

  db.prepare(`
    INSERT INTO access_control_rules (type, target, enabled, comment, created_at, updated_at)
    VALUES ('full_access_ip', ?, 1, ?, ?, ?)
    ON CONFLICT(target) DO UPDATE SET
      type = 'full_access_ip',
      enabled = 1,
      comment = excluded.comment,
      updated_at = excluded.updated_at
  `).run(clean, reason, now, now);

  db.prepare(`
    INSERT INTO access_control_audit (timestamp, action, target, operator, reason)
    VALUES (?, 'grant_full_access', ?, ?, ?)
  `).run(now, clean, operator, reason);
}

export function revokeFullAccessIp(ip: string, operator = 'admin', reason = 'Revoked full access'): void {
  const db = getDatabase();
  const clean = ip.trim();
  const now = Date.now();

  db.prepare(`
    DELETE FROM access_control_rules
    WHERE type = 'full_access_ip' AND target = ?
  `).run(clean);

  db.prepare(`
    INSERT INTO access_control_audit (timestamp, action, target, operator, reason)
    VALUES (?, 'revoke_full_access', ?, ?, ?)
  `).run(now, clean, operator, reason);
}
