import { getDatabase } from './db';
import { logger } from './logger';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'alias_edit'
  | 'alias_delete'
  | 'block_rule'
  | 'unblock_rule'
  | 'report_gen'
  | 'report_email'
  | 'timeline_view'
  | 'hosts_directory_view'
  | 'privacy_toggle'
  | 'settings_update';

export interface AuditEntry {
  id?: number;
  timestamp: number;
  actor: string;
  action: AuditAction;
  target?: string;
  details?: string;
  status: 'success' | 'failure';
  ip_address?: string;
}

/**
 * Record a security or operational event to system_audit_logs
 */
export function recordAuditLog(entry: {
  actor: string;
  action: AuditAction;
  target?: string;
  details?: string | Record<string, any>;
  status?: 'success' | 'failure';
  ip_address?: string;
}): void {
  try {
    const db = getDatabase();
    const timestamp = Date.now();
    const detailsStr =
      typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details || '';
    const status = entry.status || 'success';

    db.prepare(`
      INSERT INTO system_audit_logs (timestamp, actor, action, target, details, status, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      timestamp,
      entry.actor,
      entry.action,
      entry.target || null,
      detailsStr || null,
      status,
      entry.ip_address || null
    );

    logger.info(`[Audit] ${entry.action.toUpperCase()} by ${entry.actor}`, {
      action: entry.action,
      actor: entry.actor,
      target: entry.target,
      status,
    });
  } catch (err: any) {
    logger.error('Failed to record system audit log', { error: err });
  }
}

/**
 * Retrieve system audit logs with optional filtering and pagination
 */
export function getAuditLogs(options?: {
  action?: string;
  actor?: string;
  limit?: number;
  offset?: number;
}): { logs: AuditEntry[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  if (options?.action) {
    conditions.push('action = ?');
    params.push(options.action);
  }

  if (options?.actor) {
    conditions.push('actor LIKE ?');
    params.push(`%${options.actor}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT count(*) as total FROM system_audit_logs ${where}`).get(...params) as any;
  const total = Number(totalRow?.total || 0);

  const limit = Math.min(Math.max(1, options?.limit || 50), 200);
  const offset = Math.max(0, options?.offset || 0);

  const rows = db.prepare(`
    SELECT id, timestamp, actor, action, target, details, status, ip_address
    FROM system_audit_logs
    ${where}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as AuditEntry[];

  return { logs: rows, total };
}
