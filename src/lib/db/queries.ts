import { getDatabase } from './index';

export interface DashboardFilters {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
  clientIp?: string;  // specific IP or substring
  timeWindow?: '30m' | '1h'; // granular real-time window
}

export interface SummaryMetric {
  totalRequests: number;
  totalBytes: number;
  downloadBytes: number;
  uploadBytes: number;
  blockedRequests: number;
  uniqueDomains: number;
  uniqueClients: number;
}

export interface DomainStat {
  domain: string;
  requestCount: number;
  blockedCount: number;
  bytes: number;
  percentage: number;
}

export interface ClientIpStat {
  clientIp: string;
  userName?: string | null;
  department?: string | null;
  requestCount: number;
  blockedCount: number;
  bytes: number;
  downloadBytes: number;
  uploadBytes: number;
  percentage: number;
}

export interface LiveRequestRecord {
  id: number;
  timestamp: number;
  formattedTime: string;
  clientIp: string;
  userName?: string | null;
  department?: string | null;
  method: string;
  domain: string;
  url: string | null;
  resultCode: string;
  isBlocked: boolean;
  bytes: number;
  downloadBytes: number;
  uploadBytes: number;
}

export interface TimeSeriesPoint {
  date: string;
  requestCount: number;
  blockedCount: number;
  bytes: number;
}

export interface BlockedRequestRecord {
  id: number;
  timestamp: number;
  formattedTime: string;
  clientIp: string;
  userName?: string | null;
  department?: string | null;
  method: string;
  domain: string;
  url: string;
  resultCode: string;
  bytes: number;
}

export interface IpMappingRecord {
  clientIp: string;
  userName: string;
  department: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DistinctClientIpInfo {
  clientIp: string;
  userName?: string | null;
  department?: string | null;
}

function getTimeWindowCutoff(timeWindow?: string): number | null {
  if (timeWindow === '30m') {
    return Date.now() - 30 * 60 * 1000;
  }
  if (timeWindow === '1h') {
    return Date.now() - 60 * 60 * 1000;
  }
  return null;
}

/**
 * Build WHERE clause for daily_summaries table
 */
function buildSummaryFilterClause(filters: DashboardFilters, prefix = ''): { whereClause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.startDate) {
    conditions.push(`${prefix}date >= ?`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`${prefix}date <= ?`);
    params.push(filters.endDate);
  }

  if (filters.clientIp && filters.clientIp.trim() !== '') {
    conditions.push(`${prefix}client_ip = ?`);
    params.push(filters.clientIp.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * Get high-level summary overview metrics
 */
export function getOverviewMetrics(filters: DashboardFilters = {}): SummaryMetric {
  const db = getDatabase();
  const cutoff = getTimeWindowCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];
    if (filters.clientIp && filters.clientIp.trim() !== '') {
      conditions.push('client_ip = ?');
      params.push(filters.clientIp.trim());
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const query = `
      SELECT
        COUNT(*) AS totalRequests,
        COALESCE(SUM(bytes), 0) AS totalBytes,
        COALESCE(SUM(CASE 
          WHEN method IN ('GET', 'HEAD', 'OPTIONS') THEN bytes 
          WHEN method IN ('POST', 'PUT', 'PATCH') THEN 0 
          WHEN method = 'CONNECT' THEN CAST(bytes * 0.85 AS INTEGER)
          ELSE bytes 
        END), 0) AS downloadBytes,
        COALESCE(SUM(CASE 
          WHEN method IN ('POST', 'PUT', 'PATCH') THEN bytes 
          WHEN method IN ('GET', 'HEAD', 'OPTIONS') THEN 0 
          WHEN method = 'CONNECT' THEN CAST(bytes * 0.15 AS INTEGER)
          ELSE 0 
        END), 0) AS uploadBytes,
        COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedRequests,
        COUNT(DISTINCT domain) AS uniqueDomains,
        COUNT(DISTINCT client_ip) AS uniqueClients
      FROM raw_logs
      ${where}
    `;
    const row = db.prepare(query).get(...params) as any;
    return {
      totalRequests: Number(row?.totalRequests || 0),
      totalBytes: Number(row?.totalBytes || 0),
      downloadBytes: Number(row?.downloadBytes || 0),
      uploadBytes: Number(row?.uploadBytes || 0),
      blockedRequests: Number(row?.blockedRequests || 0),
      uniqueDomains: Number(row?.uniqueDomains || 0),
      uniqueClients: Number(row?.uniqueClients || 0),
    };
  }

  const { whereClause, params } = buildSummaryFilterClause(filters);

  const query = `
    SELECT
      COALESCE(SUM(request_count), 0) AS totalRequests,
      COALESCE(SUM(bytes), 0) AS totalBytes,
      COALESCE(SUM(blocked_count), 0) AS blockedRequests,
      COUNT(DISTINCT domain) AS uniqueDomains,
      COUNT(DISTINCT client_ip) AS uniqueClients
    FROM daily_summaries
    ${whereClause}
  `;

  const row = db.prepare(query).get(...params) as any;
  const totalB = Number(row?.totalBytes || 0);
  const downB = Math.round(totalB * 0.85);
  const upB = Math.max(0, totalB - downB);

  return {
    totalRequests: Number(row?.totalRequests || 0),
    totalBytes: totalB,
    downloadBytes: downB,
    uploadBytes: upB,
    blockedRequests: Number(row?.blockedRequests || 0),
    uniqueDomains: Number(row?.uniqueDomains || 0),
    uniqueClients: Number(row?.uniqueClients || 0),
  };
}

/**
 * Get Top Domains
 */
export function getTopDomains(filters: DashboardFilters = {}, limit = 10): DomainStat[] {
  const db = getDatabase();
  const cutoff = getTimeWindowCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];
    if (filters.clientIp && filters.clientIp.trim() !== '') {
      conditions.push('client_ip = ?');
      params.push(filters.clientIp.trim());
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM raw_logs ${where}`).get(...params) as any;
    const totalRequests = Number(totalRow?.total || 0);

    const query = `
      SELECT
        domain,
        COUNT(*) AS requestCount,
        COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount,
        COALESCE(SUM(bytes), 0) AS bytes
      FROM raw_logs
      ${where}
      GROUP BY domain
      ORDER BY requestCount DESC
      LIMIT ?
    `;
    const rows = db.prepare(query).all(...params, limit) as any[];
    return rows.map((r) => ({
      domain: r.domain,
      requestCount: Number(r.requestCount),
      blockedCount: Number(r.blockedCount),
      bytes: Number(r.bytes),
      percentage: totalRequests > 0 ? Math.round((Number(r.requestCount) / totalRequests) * 1000) / 10 : 0,
    }));
  }

  const { whereClause, params } = buildSummaryFilterClause(filters);
  const totalRow = db.prepare(`SELECT COALESCE(SUM(request_count), 0) as total FROM daily_summaries ${whereClause}`).get(...params) as any;
  const totalRequests = Number(totalRow?.total || 0);

  const query = `
    SELECT
      domain,
      SUM(request_count) AS requestCount,
      SUM(blocked_count) AS blockedCount,
      SUM(bytes) AS bytes
    FROM daily_summaries
    ${whereClause}
    GROUP BY domain
    ORDER BY requestCount DESC
    LIMIT ?
  `;

  const rows = db.prepare(query).all(...params, limit) as any[];

  return rows.map((r) => ({
    domain: r.domain,
    requestCount: Number(r.requestCount),
    blockedCount: Number(r.blockedCount),
    bytes: Number(r.bytes),
    percentage: totalRequests > 0 ? Math.round((Number(r.requestCount) / totalRequests) * 1000) / 10 : 0,
  }));
}

/**
 * Get Top Client IPs
 */
export function getTopClientIps(filters: DashboardFilters = {}, limit = 10): ClientIpStat[] {
  const db = getDatabase();
  const cutoff = getTimeWindowCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const conditions = ['r.timestamp >= ?'];
    const params: any[] = [cutoff];
    if (filters.clientIp && filters.clientIp.trim() !== '') {
      conditions.push('r.client_ip = ?');
      params.push(filters.clientIp.trim());
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM raw_logs r ${where}`).get(...params) as any;
    const totalRequests = Number(totalRow?.total || 0);

    const query = `
      SELECT
        r.client_ip AS clientIp,
        COUNT(*) AS requestCount,
        COALESCE(SUM(CASE WHEN r.is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount,
        COALESCE(SUM(r.bytes), 0) AS bytes,
        COALESCE(SUM(CASE 
          WHEN r.method IN ('GET', 'HEAD', 'OPTIONS') THEN r.bytes 
          WHEN r.method IN ('POST', 'PUT', 'PATCH') THEN 0 
          WHEN r.method = 'CONNECT' THEN CAST(r.bytes * 0.85 AS INTEGER)
          ELSE r.bytes 
        END), 0) AS downloadBytes,
        COALESCE(SUM(CASE 
          WHEN r.method IN ('POST', 'PUT', 'PATCH') THEN r.bytes 
          WHEN r.method IN ('GET', 'HEAD', 'OPTIONS') THEN 0 
          WHEN r.method = 'CONNECT' THEN CAST(r.bytes * 0.15 AS INTEGER)
          ELSE 0 
        END), 0) AS uploadBytes,
        m.user_name AS userName,
        m.department AS department
      FROM raw_logs r
      LEFT JOIN ip_mappings m ON r.client_ip = m.client_ip
      ${where}
      GROUP BY r.client_ip
      ORDER BY requestCount DESC
      LIMIT ?
    `;
    const rows = db.prepare(query).all(...params, limit) as any[];
    return rows.map((r) => ({
      clientIp: r.clientIp,
      userName: r.userName || null,
      department: r.department || null,
      requestCount: Number(r.requestCount),
      blockedCount: Number(r.blockedCount),
      bytes: Number(r.bytes),
      downloadBytes: Number(r.downloadBytes || 0),
      uploadBytes: Number(r.uploadBytes || 0),
      percentage: totalRequests > 0 ? Math.round((Number(r.requestCount) / totalRequests) * 1000) / 10 : 0,
    }));
  }

  const { whereClause: totalWhere, params: totalParams } = buildSummaryFilterClause(filters);
  const totalRow = db.prepare(`SELECT COALESCE(SUM(request_count), 0) as total FROM daily_summaries ${totalWhere}`).get(...totalParams) as any;
  const totalRequests = Number(totalRow?.total || 0);

  const { whereClause, params } = buildSummaryFilterClause(filters, 'd.');

  const query = `
    SELECT
      d.client_ip AS clientIp,
      SUM(d.request_count) AS requestCount,
      SUM(d.blocked_count) AS blockedCount,
      SUM(d.bytes) AS bytes,
      m.user_name AS userName,
      m.department AS department
    FROM daily_summaries d
    LEFT JOIN ip_mappings m ON d.client_ip = m.client_ip
    ${whereClause}
    GROUP BY d.client_ip
    ORDER BY requestCount DESC
    LIMIT ?
  `;

  const rows = db.prepare(query).all(...params, limit) as any[];

  return rows.map((r) => {
    const bytesTotal = Number(r.bytes);
    const downB = Math.round(bytesTotal * 0.85);
    const upB = Math.max(0, bytesTotal - downB);
    return {
      clientIp: r.clientIp,
      userName: r.userName || null,
      department: r.department || null,
      requestCount: Number(r.requestCount),
      blockedCount: Number(r.blockedCount),
      bytes: bytesTotal,
      downloadBytes: downB,
      uploadBytes: upB,
      percentage: totalRequests > 0 ? Math.round((Number(r.requestCount) / totalRequests) * 1000) / 10 : 0,
    };
  });
}

/**
 * Get Requests Over Time
 */
export function getRequestsOverTime(filters: DashboardFilters = {}): TimeSeriesPoint[] {
  const db = getDatabase();
  const cutoff = getTimeWindowCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];
    if (filters.clientIp && filters.clientIp.trim() !== '') {
      conditions.push('client_ip = ?');
      params.push(filters.clientIp.trim());
    }
    const where = `WHERE ${conditions.join(' AND ')}`;

    // Group by minute bucket: HH:MM
    const query = `
      SELECT
        strftime('%H:%M', timestamp / 1000, 'unixepoch', 'localtime') AS date,
        COUNT(*) AS requestCount,
        COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount,
        COALESCE(SUM(bytes), 0) AS bytes
      FROM raw_logs
      ${where}
      GROUP BY date
      ORDER BY MIN(timestamp) ASC
    `;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      date: r.date,
      requestCount: Number(r.requestCount),
      blockedCount: Number(r.blockedCount),
      bytes: Number(r.bytes),
    }));
  }

  const { whereClause, params } = buildSummaryFilterClause(filters);

  const query = `
    SELECT
      date,
      SUM(request_count) AS requestCount,
      SUM(blocked_count) AS blockedCount,
      SUM(bytes) AS bytes
    FROM daily_summaries
    ${whereClause}
    GROUP BY date
    ORDER BY date ASC
  `;

  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((r) => ({
    date: r.date,
    requestCount: Number(r.requestCount),
    blockedCount: Number(r.blockedCount),
    bytes: Number(r.bytes),
  }));
}

/**
 * Get Blocked Requests list from raw_logs (with full URL)
 */
export function getBlockedRequests(filters: DashboardFilters = {}, limit = 50, offset = 0): { records: BlockedRequestRecord[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = ['is_blocked = 1'];
  const params: any[] = [];
  const cutoff = getTimeWindowCutoff(filters.timeWindow);

  if (cutoff !== null) {
    conditions.push('timestamp >= ?');
    params.push(cutoff);
  } else {
    if (filters.startDate) {
      const startMs = new Date(`${filters.startDate}T00:00:00Z`).getTime();
      conditions.push('timestamp >= ?');
      params.push(startMs);
    }

    if (filters.endDate) {
      const endMs = new Date(`${filters.endDate}T23:59:59.999Z`).getTime();
      conditions.push('timestamp <= ?');
      params.push(endMs);
    }
  }

  if (filters.clientIp && filters.clientIp.trim() !== '') {
    conditions.push('client_ip = ?');
    params.push(filters.clientIp.trim());
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `SELECT COUNT(*) AS total FROM raw_logs ${whereClause}`;
  const totalCountRow = db.prepare(countQuery).get(...params) as any;
  const total = Number(totalCountRow?.total || 0);

  const dataQuery = `
    SELECT
      r.id,
      r.timestamp,
      r.client_ip AS clientIp,
      r.method,
      r.domain,
      r.url,
      r.result_code AS resultCode,
      r.bytes,
      m.user_name AS userName,
      m.department AS department
    FROM raw_logs r
    LEFT JOIN ip_mappings m ON r.client_ip = m.client_ip
    ${whereClause.replace(/\bclient_ip\b/g, 'r.client_ip')}
    ORDER BY r.timestamp DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(dataQuery).all(...params, limit, offset) as any[];

  const records: BlockedRequestRecord[] = rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    formattedTime: new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 19),
    clientIp: r.clientIp,
    userName: r.userName || null,
    department: r.department || null,
    method: r.method,
    domain: r.domain,
    url: r.url || '(URL not recorded)',
    resultCode: r.resultCode,
    bytes: Number(r.bytes),
  }));

  return { records, total };
}

/**
 * Get distinct client IPs for filter dropdown with user mapping
 */
export function getDistinctClientIps(): DistinctClientIpInfo[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT DISTINCT
      d.client_ip AS clientIp,
      m.user_name AS userName,
      m.department AS department
    FROM daily_summaries d
    LEFT JOIN ip_mappings m ON d.client_ip = m.client_ip
    ORDER BY d.client_ip ASC
  `).all() as any[];
  return rows.map((r) => ({
    clientIp: r.clientIp,
    userName: r.userName || null,
    department: r.department || null,
  }));
}

/**
 * IP Mappings CRUD Operations
 */
export function getIpMappings(): IpMappingRecord[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      client_ip AS clientIp,
      user_name AS userName,
      department,
      notes,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM ip_mappings
    ORDER BY user_name ASC
  `).all() as any[];
  return rows;
}

export function upsertIpMapping(
  clientIp: string,
  userName: string,
  department?: string | null,
  notes?: string | null
): void {
  const db = getDatabase();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO ip_mappings (client_ip, user_name, department, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_ip) DO UPDATE SET
      user_name = excluded.user_name,
      department = excluded.department,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);
  stmt.run(clientIp.trim(), userName.trim(), department?.trim() || null, notes?.trim() || null, now, now);
}

export function deleteIpMapping(clientIp: string): boolean {
  const db = getDatabase();
  const info = db.prepare('DELETE FROM ip_mappings WHERE client_ip = ?').run(clientIp.trim());
  return info.changes > 0;
}

/**
 * Get date range available in the database
 */
export function getDateRange(): { minDate: string | null; maxDate: string | null } {
  const db = getDatabase();
  const row = db.prepare(`SELECT MIN(date) as minDate, MAX(date) as maxDate FROM daily_summaries`).get() as any;
  return {
    minDate: row?.minDate || null,
    maxDate: row?.maxDate || null,
  };
}

/**
 * Get paginated live HTTP/S proxy requests stream
 */
export function getLiveRequests(
  filters: DashboardFilters = {},
  limit = 25,
  offset = 0
): { records: LiveRequestRecord[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  const cutoff = getTimeWindowCutoff(filters.timeWindow);
  if (cutoff !== null) {
    conditions.push('r.timestamp >= ?');
    params.push(cutoff);
  } else {
    if (filters.startDate) {
      const startMs = new Date(`${filters.startDate}T00:00:00.000Z`).getTime();
      if (!isNaN(startMs)) {
        conditions.push('r.timestamp >= ?');
        params.push(startMs);
      }
    }
    if (filters.endDate) {
      const endMs = new Date(`${filters.endDate}T23:59:59.999Z`).getTime();
      if (!isNaN(endMs)) {
        conditions.push('r.timestamp <= ?');
        params.push(endMs);
      }
    }
  }

  if (filters.clientIp && filters.clientIp.trim() !== '') {
    conditions.push('r.client_ip = ?');
    params.push(filters.clientIp.trim());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM raw_logs r ${where}`).get(...params) as any;
  const total = Number(totalRow?.total || 0);

  const query = `
    SELECT
      r.id,
      r.timestamp,
      r.client_ip AS clientIp,
      r.method,
      r.domain,
      r.url,
      r.result_code AS resultCode,
      r.is_blocked AS isBlocked,
      r.bytes,
      m.user_name AS userName,
      m.department AS department
    FROM raw_logs r
    LEFT JOIN ip_mappings m ON r.client_ip = m.client_ip
    ${where}
    ORDER BY r.timestamp DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const records: LiveRequestRecord[] = rows.map((r) => {
    const isConn = r.method === 'CONNECT';
    const isPost = ['POST', 'PUT', 'PATCH'].includes(r.method);
    const totalB = Number(r.bytes || 0);
    const downB = isPost ? 0 : isConn ? Math.round(totalB * 0.85) : totalB;
    const upB = isPost ? totalB : isConn ? Math.round(totalB * 0.15) : 0;

    return {
      id: r.id,
      timestamp: r.timestamp,
      formattedTime: new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 19),
      clientIp: r.clientIp,
      userName: r.userName || null,
      department: r.department || null,
      method: r.method,
      domain: r.domain,
      url: r.url || null,
      resultCode: r.resultCode,
      isBlocked: Boolean(r.isBlocked),
      bytes: totalB,
      downloadBytes: downB,
      uploadBytes: upB,
    };
  });

  return { records, total };
}

