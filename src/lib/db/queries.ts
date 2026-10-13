import { getDatabase } from './index';
import { getSystemSettings, getTimezoneDayBounds, formatTimestamp } from '../settings';
import { getTimeBucketConfig, formatBucketLabel, SquidTimePoint } from '../bucketing';

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

export function buildRawLogsFilterClause(
  filters: DashboardFilters,
  prefix = '',
  customTimezone?: string
): { whereClause: string; conditions: string[]; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  const tz = customTimezone || getSystemSettings().timezone || 'Asia/Colombo';

  const cutoff = getTimeWindowCutoff(filters.timeWindow);
  if (cutoff !== null) {
    conditions.push(`${prefix}timestamp >= ?`);
    params.push(cutoff);
  } else {
    if (filters.startDate) {
      const { startMs } = getTimezoneDayBounds(filters.startDate, tz);
      conditions.push(`${prefix}timestamp >= ?`);
      params.push(startMs);
    }
    if (filters.endDate) {
      const { endMs } = getTimezoneDayBounds(filters.endDate, tz);
      conditions.push(`${prefix}timestamp <= ?`);
      params.push(endMs);
    }
  }

  if (filters.clientIp && filters.clientIp.trim() !== '') {
    conditions.push(`${prefix}client_ip = ?`);
    params.push(filters.clientIp.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, conditions, params };
}

/**
 * Get high-level summary overview metrics
 */
export function getOverviewMetrics(filters: DashboardFilters = {}): SummaryMetric {
  const db = getDatabase();
  const { whereClause, params } = buildRawLogsFilterClause(filters);

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
    ${whereClause}
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

/**
 * Get Top Domains
 */
export function getTopDomains(filters: DashboardFilters = {}, limit = 10): DomainStat[] {
  const db = getDatabase();
  const { whereClause, params } = buildRawLogsFilterClause(filters);

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM raw_logs ${whereClause}`).get(...params) as any;
  const totalRequests = Number(totalRow?.total || 0);

  const query = `
    SELECT
      domain,
      COUNT(*) AS requestCount,
      COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount,
      COALESCE(SUM(bytes), 0) AS bytes
    FROM raw_logs
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
  const { whereClause, params } = buildRawLogsFilterClause(filters, 'r.');

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM raw_logs r ${whereClause}`).get(...params) as any;
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
    ${whereClause}
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

/**
 * Get Requests Over Time with Adaptive Bucketing and Zero-Filled Gaps
 */
export function getRequestsOverTime(filters: DashboardFilters = {}): SquidTimePoint[] {
  const db = getDatabase();
  const tz = getSystemSettings().timezone || 'Asia/Colombo';

  const boundsRow = db.prepare('SELECT MIN(timestamp) as minTs, MAX(timestamp) as maxTs FROM raw_logs').get() as any;
  const config = getTimeBucketConfig(filters, boundsRow?.minTs, boundsRow?.maxTs, tz);

  const conditions: string[] = ['timestamp >= ?', 'timestamp <= ?'];
  const params: any[] = [config.startMs, config.endMs];

  if (filters.clientIp && filters.clientIp.trim() !== '') {
    conditions.push('client_ip = ?');
    params.push(filters.clientIp.trim());
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT
      CAST(((timestamp - ?) / ?) AS INTEGER) AS bucket_idx,
      COUNT(*) AS requestCount,
      COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount,
      COALESCE(SUM(bytes), 0) AS bytes,
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
      END), 0) AS uploadBytes
    FROM raw_logs
    ${whereClause}
    GROUP BY bucket_idx
    ORDER BY bucket_idx ASC
  `;

  const rows = db.prepare(query).all(config.startMs, config.bucketSizeMs, ...params) as any[];
  const rowMap = new Map<number, any>();
  for (const r of rows) {
    rowMap.set(Number(r.bucket_idx), r);
  }

  // Zero-fill all buckets
  const result: SquidTimePoint[] = [];
  for (let i = 0; i < config.totalBuckets; i++) {
    const bucketStartMs = config.startMs + i * config.bucketSizeMs;
    const label = formatBucketLabel(bucketStartMs, config.labelFormat, tz);
    const existing = rowMap.get(i);

    if (existing) {
      result.push({
        timestamp: bucketStartMs,
        date: label,
        requestCount: Number(existing.requestCount || 0),
        blockedCount: Number(existing.blockedCount || 0),
        bytes: Number(existing.bytes || 0),
        downloadBytes: Number(existing.downloadBytes || 0),
        uploadBytes: Number(existing.uploadBytes || 0),
      });
    } else {
      result.push({
        timestamp: bucketStartMs,
        date: label,
        requestCount: 0,
        blockedCount: 0,
        bytes: 0,
        downloadBytes: 0,
        uploadBytes: 0,
      });
    }
  }

  return result;
}

/**
 * Get Blocked Requests list from raw_logs (with full URL)
 * Uses the exact same filter definition as getOverviewMetrics
 */
export function getBlockedRequests(
  filters: DashboardFilters = {},
  limit = 50,
  offset = 0
): { records: BlockedRequestRecord[]; total: number } {
  const db = getDatabase();
  const tz = getSystemSettings().timezone || 'Asia/Colombo';
  const { conditions, params } = buildRawLogsFilterClause(filters, 'r.', tz);
  
  // Guarantee identical blocked definition
  conditions.push('r.is_blocked = 1');
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `SELECT COUNT(*) AS total FROM raw_logs r ${whereClause}`;
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
    ${whereClause}
    ORDER BY r.timestamp DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(dataQuery).all(...params, limit, offset) as any[];

  const records: BlockedRequestRecord[] = rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    formattedTime: formatTimestamp(r.timestamp, tz),
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

export interface UnassignedIpRecord {
  clientIp: string;
  lastSeen: number;
  formattedLastSeen: string;
  logSource: string;
}

/**
 * Retrieve active internal IPs that do not have an assigned employee mapping
 */
export function getUnassignedIps(): UnassignedIpRecord[] {
  const db = getDatabase();
  const tz = getSystemSettings().timezone || 'Asia/Colombo';
  const rows = db.prepare(`
    WITH active_ips AS (
      SELECT client_ip, MAX(timestamp) as lastSeen, 'Squid' as logSource
      FROM raw_logs
      WHERE client_ip NOT IN (SELECT client_ip FROM ip_mappings)
        AND (client_ip LIKE '10.%' OR client_ip LIKE '192.168.%' OR client_ip LIKE '172.%')
      GROUP BY client_ip
      UNION ALL
      SELECT src_ip as client_ip, MAX(timestamp) as lastSeen, 'NetFlow' as logSource
      FROM netflow_logs
      WHERE src_ip NOT IN (SELECT client_ip FROM ip_mappings)
        AND (src_ip LIKE '10.%' OR src_ip LIKE '192.168.%' OR src_ip LIKE '172.%')
      GROUP BY src_ip
    )
    SELECT client_ip as clientIp, MAX(lastSeen) as lastSeen, logSource
    FROM active_ips
    GROUP BY client_ip
    ORDER BY lastSeen DESC
    LIMIT 50
  `).all() as any[];

  return rows.map((r) => ({
    clientIp: r.clientIp,
    lastSeen: Number(r.lastSeen),
    formattedLastSeen: formatTimestamp(Number(r.lastSeen), tz),
    logSource: r.logSource,
  }));
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

export interface FailedRequestSummary {
  totalFailed: number;
  totalRequests: number;
  failureRate: number;
  byResultCode: Array<{
    resultCode: string;
    count: number;
    percentage: number;
  }>;
  topFailedDomains: Array<{
    domain: string;
    count: number;
    sampleResultCode: string;
  }>;
  topFailedClients: Array<{
    clientIp: string;
    userName?: string | null;
    department?: string | null;
    count: number;
  }>;
}

export function getFailedRequestsSummary(filters: DashboardFilters = {}): FailedRequestSummary {
  const db = getDatabase();
  const { conditions, params } = buildRawLogsFilterClause(filters);

  // Failed codes: 503, 403, 407, 504, DENIED
  const failClause = `(result_code LIKE '%/503%' OR result_code LIKE '%/403%' OR result_code LIKE '%/407%' OR result_code LIKE '%/504%' OR result_code LIKE '%DENIED%')`;

  const baseWhere = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const failedWhere = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')} AND ${failClause}`
    : `WHERE ${failClause}`;

  const totalReqRow = db.prepare(`SELECT COUNT(*) as cnt FROM raw_logs ${baseWhere}`).get(...params) as any;
  const totalRequests = Number(totalReqRow?.cnt || 0);

  const totalFailRow = db.prepare(`SELECT COUNT(*) as cnt FROM raw_logs ${failedWhere}`).get(...params) as any;
  const totalFailed = Number(totalFailRow?.cnt || 0);
  const failureRate = totalRequests > 0 ? Number(((totalFailed / totalRequests) * 100).toFixed(1)) : 0;

  // Breakdown by result code
  const codeRows = db.prepare(`
    SELECT result_code, COUNT(*) as cnt
    FROM raw_logs
    ${failedWhere}
    GROUP BY result_code
    ORDER BY cnt DESC
    LIMIT 6
  `).all(...params) as any[];

  const byResultCode = codeRows.map((r) => ({
    resultCode: r.result_code,
    count: Number(r.cnt),
    percentage: totalFailed > 0 ? Number(((r.cnt / totalFailed) * 100).toFixed(1)) : 0,
  }));

  // Top failed domains
  const domainRows = db.prepare(`
    SELECT domain, COUNT(*) as cnt, MAX(result_code) as sampleCode
    FROM raw_logs
    ${failedWhere}
    GROUP BY domain
    ORDER BY cnt DESC
    LIMIT 8
  `).all(...params) as any[];

  const topFailedDomains = domainRows.map((r) => ({
    domain: r.domain,
    count: Number(r.cnt),
    sampleResultCode: r.sampleCode,
  }));

  // Top failed clients
  const clientRows = db.prepare(`
    SELECT r.client_ip, COUNT(*) as cnt, m.user_name, m.department
    FROM raw_logs r
    LEFT JOIN ip_mappings m ON r.client_ip = m.client_ip
    ${failedWhere.replace(/client_ip/g, 'r.client_ip')}
    GROUP BY r.client_ip
    ORDER BY cnt DESC
    LIMIT 8
  `).all(...params) as any[];

  const topFailedClients = clientRows.map((r) => ({
    clientIp: r.client_ip,
    userName: r.user_name || null,
    department: r.department || null,
    count: Number(r.cnt),
  }));

  return {
    totalFailed,
    totalRequests,
    failureRate,
    byResultCode,
    topFailedDomains,
    topFailedClients,
  };
}


