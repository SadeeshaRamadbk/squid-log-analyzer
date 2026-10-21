import { getDatabase } from './index';

export interface SyslogEventRow {
  id: number;
  timestamp: number;
  facility: number;
  facility_label: string;
  severity: number;
  severity_label: string;
  hostname: string;
  app_name: string;
  proc_id?: string | null;
  message: string;
  raw_message?: string;
}

export interface SyslogQueryParams {
  page?: number;
  limit?: number;
  severity?: number | number[];
  severityLevel?: 'all' | 'errors' | 'warnings' | 'notices' | 'info';
  facility?: string | number;
  appName?: string;
  hostname?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  timeWindow?: '15m' | '30m' | '1h' | '24h';
}

export interface SyslogQueryResult {
  events: SyslogEventRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SyslogTimelineBucket {
  timestamp: number;
  timeLabel: string;
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

export interface SyslogAppStat {
  app_name: string;
  count: number;
  errorCount: number;
  warningCount: number;
}

export interface SyslogOverviewStats {
  totalEvents: number;
  criticalErrors: number;
  warnings: number;
  notices: number;
  info: number;
  debug: number;
  topApps: SyslogAppStat[];
  timeline: SyslogTimelineBucket[];
}

function resolveTimeRange(params: { startDate?: string; endDate?: string; timeWindow?: string }): { startMs?: number; endMs?: number } {
  const now = Date.now();
  if (params.timeWindow) {
    let windowMs = 3600 * 1000; // default 1h
    if (params.timeWindow === '15m') windowMs = 15 * 60 * 1000;
    else if (params.timeWindow === '30m') windowMs = 30 * 60 * 1000;
    else if (params.timeWindow === '1h') windowMs = 60 * 60 * 1000;
    else if (params.timeWindow === '24h') windowMs = 24 * 3600 * 1000;
    return { startMs: now - windowMs, endMs: now };
  }

  let startMs: number | undefined;
  let endMs: number | undefined;

  if (params.startDate) {
    const s = new Date(params.startDate);
    s.setHours(0, 0, 0, 0);
    startMs = s.getTime();
  }

  if (params.endDate) {
    const e = new Date(params.endDate);
    e.setHours(23, 59, 59, 999);
    endMs = e.getTime();
  }

  return { startMs, endMs };
}

/**
 * Fetch paginated and filtered syslog events
 */
export function getSyslogEvents(params: SyslogQueryParams = {}): SyslogQueryResult {
  const db = getDatabase();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(200, Math.max(1, params.limit || 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: any[] = [];

  const { startMs, endMs } = resolveTimeRange(params);

  if (startMs !== undefined) {
    conditions.push('timestamp >= ?');
    queryParams.push(startMs);
  }
  if (endMs !== undefined) {
    conditions.push('timestamp <= ?');
    queryParams.push(endMs);
  }

  // Severity Level Filter
  if (params.severityLevel) {
    if (params.severityLevel === 'errors') {
      conditions.push('severity <= 3'); // 0=emerg, 1=alert, 2=crit, 3=err
    } else if (params.severityLevel === 'warnings') {
      conditions.push('severity = 4');
    } else if (params.severityLevel === 'notices') {
      conditions.push('severity = 5');
    } else if (params.severityLevel === 'info') {
      conditions.push('severity >= 6');
    }
  } else if (params.severity !== undefined) {
    if (Array.isArray(params.severity)) {
      if (params.severity.length > 0) {
        conditions.push(`severity IN (${params.severity.map(() => '?').join(',')})`);
        queryParams.push(...params.severity);
      }
    } else {
      conditions.push('severity = ?');
      queryParams.push(params.severity);
    }
  }

  if (params.appName) {
    conditions.push('app_name = ?');
    queryParams.push(params.appName.toLowerCase().trim());
  }

  if (params.facility !== undefined) {
    if (typeof params.facility === 'number') {
      conditions.push('facility = ?');
      queryParams.push(params.facility);
    } else {
      conditions.push('facility_label = ?');
      queryParams.push(params.facility.toLowerCase().trim());
    }
  }

  if (params.hostname) {
    conditions.push('hostname = ?');
    queryParams.push(params.hostname.trim());
  }

  if (params.search) {
    const searchPattern = `%${params.search.trim()}%`;
    conditions.push('(message LIKE ? OR app_name LIKE ? OR hostname LIKE ?)');
    queryParams.push(searchPattern, searchPattern, searchPattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total matching count
  const countStmt = db.prepare(`SELECT count(*) as count FROM syslog_events ${whereClause}`);
  const totalRow = countStmt.get(...queryParams) as any;
  const total = totalRow?.count || 0;

  // Query events
  const dataStmt = db.prepare(`
    SELECT id, timestamp, facility, facility_label, severity, severity_label,
           hostname, app_name, proc_id, message, raw_message
    FROM syslog_events
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const events = dataStmt.all(...queryParams, limit, offset) as SyslogEventRow[];

  return {
    events,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Fetch aggregated statistics, severity breakdowns, and timeline histogram
 */
export function getSyslogStats(params: { startDate?: string; endDate?: string; timeWindow?: string } = {}): SyslogOverviewStats {
  const db = getDatabase();
  const { startMs, endMs } = resolveTimeRange(params);

  const conditions: string[] = [];
  const queryParams: any[] = [];

  if (startMs !== undefined) {
    conditions.push('timestamp >= ?');
    queryParams.push(startMs);
  }
  if (endMs !== undefined) {
    conditions.push('timestamp <= ?');
    queryParams.push(endMs);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. Overall severity counts
  const countsStmt = db.prepare(`
    SELECT
      count(*) AS total,
      SUM(CASE WHEN severity <= 3 THEN 1 ELSE 0 END) AS critical_errors,
      SUM(CASE WHEN severity = 4 THEN 1 ELSE 0 END) AS warnings,
      SUM(CASE WHEN severity = 5 THEN 1 ELSE 0 END) AS notices,
      SUM(CASE WHEN severity = 6 THEN 1 ELSE 0 END) AS info,
      SUM(CASE WHEN severity = 7 THEN 1 ELSE 0 END) AS debug
    FROM syslog_events
    ${whereClause}
  `);

  const countsRow = countsStmt.get(...queryParams) as any;

  // 2. Top applications producing logs
  const topAppsStmt = db.prepare(`
    SELECT
      app_name,
      count(*) AS count,
      SUM(CASE WHEN severity <= 3 THEN 1 ELSE 0 END) AS error_count,
      SUM(CASE WHEN severity = 4 THEN 1 ELSE 0 END) AS warning_count
    FROM syslog_events
    ${whereClause}
    GROUP BY app_name
    ORDER BY count DESC
    LIMIT 8
  `);

  const topAppsRows = topAppsStmt.all(...queryParams) as any[];
  const topApps: SyslogAppStat[] = topAppsRows.map((r) => ({
    app_name: r.app_name,
    count: r.count || 0,
    errorCount: r.error_count || 0,
    warningCount: r.warning_count || 0,
  }));

  // 3. Timeline histogram (1 hour buckets, or 15m if window is short)
  const bucketMs = params.timeWindow === '15m' || params.timeWindow === '30m' ? 60 * 1000 : 3600 * 1000;

  const timelineStmt = db.prepare(`
    SELECT
      CAST((timestamp / ${bucketMs}) AS INTEGER) * ${bucketMs} AS bucket_ts,
      count(*) AS total,
      SUM(CASE WHEN severity <= 3 THEN 1 ELSE 0 END) AS errors,
      SUM(CASE WHEN severity = 4 THEN 1 ELSE 0 END) AS warnings,
      SUM(CASE WHEN severity >= 5 THEN 1 ELSE 0 END) AS info
    FROM syslog_events
    ${whereClause}
    GROUP BY bucket_ts
    ORDER BY bucket_ts ASC
    LIMIT 48
  `);

  const timelineRows = timelineStmt.all(...queryParams) as any[];
  const timeline: SyslogTimelineBucket[] = timelineRows.map((r) => {
    const d = new Date(r.bucket_ts);
    const timeLabel = bucketMs < 3600 * 1000
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.getHours()}:00`;

    return {
      timestamp: r.bucket_ts,
      timeLabel,
      total: r.total || 0,
      errors: r.errors || 0,
      warnings: r.warnings || 0,
      info: r.info || 0,
    };
  });

  return {
    totalEvents: countsRow?.total || 0,
    criticalErrors: countsRow?.critical_errors || 0,
    warnings: countsRow?.warnings || 0,
    notices: countsRow?.notices || 0,
    info: countsRow?.info || 0,
    debug: countsRow?.debug || 0,
    topApps,
    timeline,
  };
}

/**
 * Get distinct filter dropdown values
 */
export function getSyslogFilterOptions(): { apps: string[]; facilities: string[] } {
  const db = getDatabase();
  try {
    const appRows = db.prepare('SELECT DISTINCT app_name FROM syslog_events ORDER BY app_name ASC LIMIT 50').all() as any[];
    const facilityRows = db.prepare('SELECT DISTINCT facility_label FROM syslog_events ORDER BY facility_label ASC LIMIT 30').all() as any[];

    return {
      apps: appRows.map((r) => r.app_name).filter(Boolean),
      facilities: facilityRows.map((r) => r.facility_label).filter(Boolean),
    };
  } catch {
    return { apps: [], facilities: [] };
  }
}
