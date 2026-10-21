import { getDatabase } from './index';
import { getSystemSettings, getTimezoneDayBounds, formatTimestamp, isInternalIp as isInternalIpSettings } from '@/lib/settings';
import { getTimeBucketConfig, formatBucketLabel, NetflowTimePoint } from '@/lib/bucketing';
import { isValidIp, isValidDate, sanitizeParam } from '@/lib/validation';

export interface NetflowFilters {
  startDate?: string;
  endDate?: string;
  srcIp?: string;
  dstIp?: string;
  protocol?: string;
  serviceName?: string;
  timeWindow?: '30m' | '1h';
  hideFirewallTraffic?: boolean;
  hideProxyHop?: boolean;
  trafficType?: 'all' | 'external' | 'internal';
  search?: string;
}

export interface NetflowSummaryMetrics {
  totalFlows: number;
  totalBytes: number;
  downloadBytes: number;
  uploadBytes: number;
  totalPackets: number;
  uniqueSrcIps: number;
  uniqueDstIps: number;
  topProtocol: string;
}

export interface TopTalkerRecord {
  srcIp: string;
  userName?: string | null;
  department?: string | null;
  flowCount: number;
  bytes: number;
  downloadBytes: number;
  uploadBytes: number;
  packets: number;
  percentage: number;
}

export interface TopDestinationRecord {
  dstIp: string;
  flowCount: number;
  bytes: number;
  packets: number;
  percentage: number;
  isInternal?: boolean;
}

export interface TopServiceRecord {
  dstPort: number;
  serviceName: string;
  protocol: string;
  flowCount: number;
  bytes: number;
  percentage: number;
}

export interface ProtocolStatRecord {
  protocol: string;
  flowCount: number;
  bytes: number;
  percentage: number;
}

export type NetflowTimeSeriesPoint = NetflowTimePoint;

export interface NetflowFlowRecord {
  id: number;
  timestamp: number;
  formattedTime: string;
  srcIp: string;
  userName?: string | null;
  department?: string | null;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  protocol: string;
  serviceName: string;
  bytes: number;
  direction: 'download' | 'upload' | 'internal';
  packets: number;
  tcpFlags: string;
  flowDurationMs: number;
}

export function isInternalIp(ip: string): boolean {
  return isInternalIpSettings(ip);
}

// SQL fragments for determining internal vs external traffic (RFC1918 + RFC6598)
const IS_SRC_INTERNAL = `(src_ip LIKE '10.%' OR src_ip LIKE '192.168.%' OR src_ip LIKE '172.16.%' OR src_ip LIKE '172.17.%' OR src_ip LIKE '172.18.%' OR src_ip LIKE '172.19.%' OR src_ip LIKE '172.2%.' OR src_ip LIKE '172.30.%' OR src_ip LIKE '172.31.%' OR src_ip LIKE '100.64.%')`;
const IS_DST_INTERNAL = `(dst_ip LIKE '10.%' OR dst_ip LIKE '192.168.%' OR dst_ip LIKE '172.16.%' OR dst_ip LIKE '172.17.%' OR dst_ip LIKE '172.18.%' OR dst_ip LIKE '172.19.%' OR dst_ip LIKE '172.2%.' OR dst_ip LIKE '172.30.%' OR dst_ip LIKE '172.31.%' OR dst_ip LIKE '100.64.%')`;

/**
 * Build unified WHERE conditions for netflow queries
 */
/**
 * Select the most optimal table: hourly rollups for multi-day queries, minute rollups for short ranges
 */
export function getOptimizedRollupTable(filters: NetflowFilters): { table: string; timeCol: string } {
  // If specific date range is larger than 2 days, use hourly rollups
  if (filters.startDate && filters.endDate && filters.startDate !== filters.endDate) {
    return { table: 'netflow_hourly_rollups', timeCol: 'bucket_timestamp' };
  }
  // Otherwise minute rollups are fastest and granular
  return { table: 'netflow_minute_rollups', timeCol: 'bucket_timestamp' };
}

/**
 * Build unified WHERE conditions for netflow queries
 */
export function buildNetflowFilterClause(filters: NetflowFilters = {}, prefix = '', timeCol = 'timestamp') {
  const settings = getSystemSettings();
  const tz = settings.timezone || 'Asia/Colombo';
  const conditions: string[] = [];
  const params: any[] = [];

  // Time window / date bounds
  if (filters.timeWindow === '30m') {
    conditions.push(`${prefix}${timeCol} >= ?`);
    params.push(Date.now() - 30 * 60 * 1000);
  } else if (filters.timeWindow === '1h') {
    conditions.push(`${prefix}${timeCol} >= ?`);
    params.push(Date.now() - 60 * 60 * 1000);
  } else {
    if (filters.startDate && isValidDate(filters.startDate)) {
      const { startMs } = getTimezoneDayBounds(filters.startDate, tz);
      conditions.push(`${prefix}${timeCol} >= ?`);
      params.push(startMs);
    }
    if (filters.endDate && isValidDate(filters.endDate)) {
      const { endMs } = getTimezoneDayBounds(filters.endDate, tz);
      conditions.push(`${prefix}${timeCol} <= ?`);
      params.push(endMs);
    }
  }

  // Source / Destination IP filter (validated IPv4)
  if (filters.srcIp && isValidIp(filters.srcIp.trim())) {
    const ip = filters.srcIp.trim();
    conditions.push(`(${prefix}src_ip = ? OR ${prefix}dst_ip = ?)`);
    params.push(ip, ip);
  }
  if (filters.dstIp && isValidIp(filters.dstIp.trim())) {
    conditions.push(`${prefix}dst_ip = ?`);
    params.push(filters.dstIp.trim());
  }

  // Protocol filter
  const cleanProto = sanitizeParam(filters.protocol, 16);
  if (cleanProto) {
    conditions.push(`${prefix}protocol = ?`);
    params.push(cleanProto);
  }

  const cleanService = sanitizeParam(filters.serviceName, 64);
  if (cleanService) {
    conditions.push(`${prefix}service_name = ?`);
    params.push(cleanService);
  }

  // Search keyword across IP, service, protocol
  if (filters.search && filters.search.trim() !== '') {
    const s = `%${filters.search.trim()}%`;
    conditions.push(`(${prefix}src_ip LIKE ? OR ${prefix}dst_ip LIKE ? OR ${prefix}service_name LIKE ? OR ${prefix}protocol LIKE ?)`);
    params.push(s, s, s, s);
  }

  // Hide firewall self-traffic (defaults to true)
  const hideFw = filters.hideFirewallTraffic !== undefined ? filters.hideFirewallTraffic : settings.hideFirewallTraffic;
  if (hideFw && settings.firewallIp && isValidIp(settings.firewallIp)) {
    conditions.push(`(${prefix}src_ip != ? AND ${prefix}dst_ip != ?)`);
    params.push(settings.firewallIp, settings.firewallIp);
  }

  // Hide proxy hop (Squid port 3128, defaults to true)
  const hideProxy = filters.hideProxyHop !== undefined ? filters.hideProxyHop : settings.hideProxyHop;
  if (hideProxy && settings.squidPort) {
    if (timeCol === 'bucket_timestamp') {
      conditions.push(`${prefix}dst_port != ?`);
      params.push(settings.squidPort);
    } else {
      conditions.push(`(${prefix}src_port != ? AND ${prefix}dst_port != ?)`);
      params.push(settings.squidPort, settings.squidPort);
    }
  }

  // Traffic Type filter
  if (filters.trafficType === 'external') {
    conditions.push(`((${prefix}${IS_SRC_INTERNAL} AND NOT ${prefix}${IS_DST_INTERNAL}) OR (NOT ${prefix}${IS_SRC_INTERNAL} AND ${prefix}${IS_DST_INTERNAL}))`);
  } else if (filters.trafficType === 'internal') {
    conditions.push(`(${prefix}${IS_SRC_INTERNAL} AND ${prefix}${IS_DST_INTERNAL})`);
  }

  return { conditions, params, tz, settings };
}

/**
 * Get NetFlow Overview KPI Metrics (Total, Download, Upload) - served from roll-ups
 */
export function getNetflowMetrics(filters: NetflowFilters = {}): NetflowSummaryMetrics {
  const db = getDatabase();
  const { table, timeCol } = getOptimizedRollupTable(filters);
  const { conditions, params } = buildNetflowFilterClause(filters, '', timeCol);

  let uploadCase = `CASE WHEN ${IS_SRC_INTERNAL} AND NOT ${IS_DST_INTERNAL} THEN bytes ELSE 0 END`;
  let downloadCase = `CASE WHEN ${IS_DST_INTERNAL} AND NOT ${IS_SRC_INTERNAL} THEN bytes ELSE 0 END`;

  if (filters.srcIp?.trim() && isValidIp(filters.srcIp.trim())) {
    const ip = filters.srcIp.trim();
    uploadCase = `CASE WHEN src_ip = '${ip}' THEN bytes ELSE 0 END`;
    downloadCase = `CASE WHEN dst_ip = '${ip}' THEN bytes ELSE 0 END`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT
      COALESCE(SUM(flow_count), 0) AS totalFlows,
      COALESCE(SUM(bytes), 0) AS totalBytes,
      COALESCE(SUM(${uploadCase}), 0) AS uploadBytes,
      COALESCE(SUM(${downloadCase}), 0) AS downloadBytes,
      COALESCE(SUM(packets), 0) AS totalPackets,
      COUNT(DISTINCT src_ip) AS uniqueSrcIps,
      COUNT(DISTINCT dst_ip) AS uniqueDstIps
    FROM ${table}
    ${where}
  `;
  const row = db.prepare(query).get(...params) as any;

  const protoRow = db.prepare(`SELECT protocol FROM ${table} ${where} GROUP BY protocol ORDER BY SUM(flow_count) DESC LIMIT 1`).get(...params) as any;

  return {
    totalFlows: Number(row?.totalFlows || 0),
    totalBytes: Number(row?.totalBytes || 0),
    uploadBytes: Number(row?.uploadBytes || 0),
    downloadBytes: Number(row?.downloadBytes || 0),
    totalPackets: Number(row?.totalPackets || 0),
    uniqueSrcIps: Number(row?.uniqueSrcIps || 0),
    uniqueDstIps: Number(row?.uniqueDstIps || 0),
    topProtocol: protoRow?.protocol || 'TCP',
  };
}

/**
 * Get NetFlow Throughput Time Series with Adaptive Bucketing & Zero-Filling - served from roll-ups
 */
export function getNetflowThroughput(filters: NetflowFilters = {}): NetflowTimeSeriesPoint[] {
  const db = getDatabase();
  const settings = getSystemSettings();
  const tz = settings.timezone || 'Asia/Colombo';

  // Determine bounds from rollup table
  const rangeRow = db.prepare('SELECT MIN(bucket_timestamp) AS minMs, MAX(bucket_timestamp) AS maxMs FROM netflow_minute_rollups').get() as any;
  const config = getTimeBucketConfig(filters, rangeRow?.minMs, rangeRow?.maxMs, tz);

  // If bucket size >= 1 hour (3600000ms), serve from hourly rollups for instant performance
  const targetTable = config.bucketSizeMs >= 3600000 ? 'netflow_hourly_rollups' : 'netflow_minute_rollups';

  const { conditions, params } = buildNetflowFilterClause(filters, '', 'bucket_timestamp');

  let uploadCase = `CASE WHEN ${IS_SRC_INTERNAL} AND NOT ${IS_DST_INTERNAL} THEN bytes ELSE 0 END`;
  let downloadCase = `CASE WHEN ${IS_DST_INTERNAL} AND NOT ${IS_SRC_INTERNAL} THEN bytes ELSE 0 END`;

  if (filters.srcIp?.trim() && isValidIp(filters.srcIp.trim())) {
    const ip = filters.srcIp.trim();
    uploadCase = `CASE WHEN src_ip = '${ip}' THEN bytes ELSE 0 END`;
    downloadCase = `CASE WHEN dst_ip = '${ip}' THEN bytes ELSE 0 END`;
  }

  // Ensure query only looks inside [startMs, endMs]
  conditions.push('bucket_timestamp >= ? AND bucket_timestamp <= ?');
  params.push(config.startMs, config.endMs);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT
      CAST((bucket_timestamp - ?) / ? AS INTEGER) AS bucket_idx,
      COALESCE(SUM(flow_count), 0) AS flowCount,
      COALESCE(SUM(bytes), 0) AS bytes,
      COALESCE(SUM(${uploadCase}), 0) AS uploadBytes,
      COALESCE(SUM(${downloadCase}), 0) AS downloadBytes,
      COALESCE(SUM(packets), 0) AS packets
    FROM ${targetTable}
    ${whereClause}
    GROUP BY bucket_idx
    ORDER BY bucket_idx ASC
  `;

  const rows = db.prepare(query).all(config.startMs, config.bucketSizeMs, ...params) as any[];
  const rowMap = new Map<number, any>();
  for (const r of rows) {
    rowMap.set(Number(r.bucket_idx), r);
  }

  const result: NetflowTimeSeriesPoint[] = [];
  for (let i = 0; i < config.totalBuckets; i++) {
    const bucketStartMs = config.startMs + i * config.bucketSizeMs;
    const label = formatBucketLabel(bucketStartMs, config.labelFormat, tz);
    const existing = rowMap.get(i);

    if (existing) {
      result.push({
        timestamp: bucketStartMs,
        date: label,
        flowCount: Number(existing.flowCount || 0),
        bytes: Number(existing.bytes || 0),
        uploadBytes: Number(existing.uploadBytes || 0),
        downloadBytes: Number(existing.downloadBytes || 0),
        packets: Number(existing.packets || 0),
      });
    } else {
      result.push({
        timestamp: bucketStartMs,
        date: label,
        flowCount: 0,
        bytes: 0,
        uploadBytes: 0,
        downloadBytes: 0,
        packets: 0,
      });
    }
  }

  return result;
}

/**
 * Get Top Talkers (Internal Hosts & Users) - served from roll-ups
 */
export function getTopTalkers(filters: NetflowFilters = {}, limit = 10): TopTalkerRecord[] {
  const db = getDatabase();
  const { table, timeCol } = getOptimizedRollupTable(filters);
  const { conditions, params } = buildNetflowFilterClause(filters, '', timeCol);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM ${table} ${where}`).get(...params) as any;
  const totalBytes = Number(totalRow?.totalBytes || 0);

  const query = `
    WITH unified AS (
      SELECT src_ip AS client_ip, bytes AS upload_bytes, 0 AS download_bytes, flow_count, packets
      FROM ${table}
      ${where ? where + ' AND' : 'WHERE'} ${IS_SRC_INTERNAL}
      UNION ALL
      SELECT dst_ip AS client_ip, 0 AS upload_bytes, bytes AS download_bytes, flow_count, packets
      FROM ${table}
      ${where ? where + ' AND' : 'WHERE'} ${IS_DST_INTERNAL}
    )
    SELECT
      u.client_ip AS srcIp,
      m.user_name AS userName,
      m.department AS department,
      COALESCE(SUM(u.upload_bytes), 0) AS uploadBytes,
      COALESCE(SUM(u.download_bytes), 0) AS downloadBytes,
      COALESCE(SUM(u.upload_bytes + u.download_bytes), 0) AS bytes,
      COALESCE(SUM(u.flow_count), 0) AS flowCount,
      COALESCE(SUM(u.packets), 0) AS packets
    FROM unified u
    LEFT JOIN ip_mappings m ON u.client_ip = m.client_ip
    WHERE u.client_ip IS NOT NULL AND u.client_ip != ''
    GROUP BY u.client_ip
    ORDER BY bytes DESC
    LIMIT ?
  `;

  const rows = db.prepare(query).all(...params, ...params, limit) as any[];
  return rows.map((r) => ({
    srcIp: r.srcIp,
    userName: r.userName || null,
    department: r.department || null,
    flowCount: Number(r.flowCount),
    bytes: Number(r.bytes),
    uploadBytes: Number(r.uploadBytes),
    downloadBytes: Number(r.downloadBytes),
    packets: Number(r.packets),
    percentage: totalBytes > 0 ? Math.round((Number(r.bytes) / totalBytes) * 1000) / 10 : 0,
  }));
}

/**
 * Get Top Remote Endpoints (Exclusively External Destination IPs) - served from roll-ups
 */
export function getTopDestinations(filters: NetflowFilters = {}, limit = 10): TopDestinationRecord[] {
  const db = getDatabase();
  const { table, timeCol } = getOptimizedRollupTable(filters);
  const { conditions, params } = buildNetflowFilterClause(filters, '', timeCol);

  // Requirement: Only show External hosts in Top Remote Endpoints
  conditions.push(`NOT ${IS_DST_INTERNAL}`);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM ${table} ${where}`).get(...params) as any;
  const totalBytes = Number(totalRow?.totalBytes || 0);

  const query = `
    SELECT
      dst_ip AS dstIp,
      COALESCE(SUM(flow_count), 0) AS flowCount,
      COALESCE(SUM(bytes), 0) AS bytes,
      COALESCE(SUM(packets), 0) AS packets
    FROM ${table}
    ${where}
    GROUP BY dst_ip
    ORDER BY bytes DESC
    LIMIT ?
  `;
  const rows = db.prepare(query).all(...params, limit) as any[];
  return rows.map((r) => ({
    dstIp: r.dstIp,
    flowCount: Number(r.flowCount),
    bytes: Number(r.bytes),
    packets: Number(r.packets),
    percentage: totalBytes > 0 ? Math.round((Number(r.bytes) / totalBytes) * 1000) / 10 : 0,
    isInternal: false,
  }));
}

/**
 * Get Internal <-> Internal Traffic (East-West LAN Traffic) - served from roll-ups
 */
export function getInternalTraffic(filters: NetflowFilters = {}, limit = 10): TopDestinationRecord[] {
  const db = getDatabase();
  const { table, timeCol } = getOptimizedRollupTable(filters);
  const { conditions, params } = buildNetflowFilterClause(filters, '', timeCol);

  // Both source and destination internal
  conditions.push(IS_SRC_INTERNAL);
  conditions.push(IS_DST_INTERNAL);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM ${table} ${where}`).get(...params) as any;
  const totalBytes = Number(totalRow?.totalBytes || 0);

  const query = `
    SELECT
      dst_ip AS dstIp,
      COALESCE(SUM(flow_count), 0) AS flowCount,
      COALESCE(SUM(bytes), 0) AS bytes,
      COALESCE(SUM(packets), 0) AS packets
    FROM ${table}
    ${where}
    GROUP BY dst_ip
    ORDER BY bytes DESC
    LIMIT ?
  `;
  const rows = db.prepare(query).all(...params, limit) as any[];
  return rows.map((r) => ({
    dstIp: r.dstIp,
    flowCount: Number(r.flowCount),
    bytes: Number(r.bytes),
    packets: Number(r.packets),
    percentage: totalBytes > 0 ? Math.round((Number(r.bytes) / totalBytes) * 1000) / 10 : 0,
    isInternal: true,
  }));
}

/**
 * Get Top Services & Ports - served from roll-ups
 */
export function getTopServices(filters: NetflowFilters = {}, limit = 10): TopServiceRecord[] {
  const db = getDatabase();
  const { table, timeCol } = getOptimizedRollupTable(filters);
  const { conditions, params } = buildNetflowFilterClause(filters, '', timeCol);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM ${table} ${where}`).get(...params) as any;
  const totalBytes = Number(totalRow?.totalBytes || 0);

  const query = `
    SELECT
      CASE 
        WHEN dst_port >= 49152 THEN 49152 
        ELSE dst_port 
      END AS dstPort,
      CASE 
        WHEN dst_port >= 49152 THEN 'Ephemeral / Other (49152+)' 
        ELSE service_name 
      END AS serviceName,
      protocol,
      COALESCE(SUM(flow_count), 0) AS flowCount,
      COALESCE(SUM(bytes), 0) AS bytes
    FROM ${table}
    ${where}
    GROUP BY 
      CASE WHEN dst_port >= 49152 THEN 49152 ELSE dst_port END,
      protocol
    ORDER BY bytes DESC
    LIMIT ?
  `;
  const rows = db.prepare(query).all(...params, limit) as any[];
  return rows.map((r) => ({
    dstPort: Number(r.dstPort),
    serviceName: r.serviceName || `Port ${r.dstPort}`,
    protocol: r.protocol,
    flowCount: Number(r.flowCount),
    bytes: Number(r.bytes),
    percentage: totalBytes > 0 ? Math.round((Number(r.bytes) / totalBytes) * 1000) / 10 : 0,
  }));
}

/**
 * Get Protocol Distribution (TCP vs UDP vs ICMP) - served from roll-ups
 */
export function getProtocolDistribution(filters: NetflowFilters = {}): ProtocolStatRecord[] {
  const db = getDatabase();
  const { table, timeCol } = getOptimizedRollupTable(filters);
  const { conditions, params } = buildNetflowFilterClause(filters, '', timeCol);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COALESCE(SUM(flow_count), 0) as total FROM ${table} ${where}`).get(...params) as any;
  const total = Number(totalRow?.total || 0);

  const rows = db.prepare(`
    SELECT protocol, COALESCE(SUM(flow_count), 0) as flowCount, COALESCE(SUM(bytes), 0) as bytes
    FROM ${table}
    ${where}
    GROUP BY protocol
    ORDER BY flowCount DESC
  `).all(...params) as any[];

  return rows.map((r) => ({
    protocol: r.protocol,
    flowCount: Number(r.flowCount),
    bytes: Number(r.bytes),
    percentage: total > 0 ? Math.round((Number(r.flowCount) / total) * 1000) / 10 : 0,
  }));
}

/**
 * Get Recent Raw Flows with directional resolution (Upload / Download / Internal)
 */
export function getRecentFlows(filters: NetflowFilters = {}, limit = 50, offset = 0): { records: NetflowFlowRecord[]; total: number } {
  const db = getDatabase();
  const { conditions, params, tz } = buildNetflowFilterClause(filters, 'r.');

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM netflow_logs r ${where}`).get(...params) as any;
  const total = Number(totalRow?.total || 0);

  const query = `
    SELECT
      r.id,
      r.timestamp,
      r.src_ip AS srcIp,
      COALESCE(m_src.user_name, m_dst.user_name) AS userName,
      COALESCE(m_src.department, m_dst.department) AS department,
      r.dst_ip AS dstIp,
      r.src_port AS srcPort,
      r.dst_port AS dstPort,
      r.protocol,
      r.service_name AS serviceName,
      r.bytes,
      r.packets,
      r.tcp_flags AS tcpFlags,
      r.flow_duration_ms AS flowDurationMs
    FROM netflow_logs r
    LEFT JOIN ip_mappings m_src ON r.src_ip = m_src.client_ip
    LEFT JOIN ip_mappings m_dst ON r.dst_ip = m_dst.client_ip
    ${where}
    ORDER BY r.timestamp DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const records: NetflowFlowRecord[] = rows.map((r) => {
    const isSrcInt = isInternalIp(r.srcIp);
    const isDstInt = isInternalIp(r.dstIp);
    let direction: 'download' | 'upload' | 'internal' = 'internal';
    if (isSrcInt && !isDstInt) direction = 'upload';
    else if (!isSrcInt && isDstInt) direction = 'download';

    return {
      id: r.id,
      timestamp: r.timestamp,
      formattedTime: formatTimestamp(r.timestamp, tz),
      srcIp: r.srcIp,
      userName: r.userName || null,
      department: r.department || null,
      dstIp: r.dstIp,
      srcPort: r.srcPort,
      dstPort: r.dstPort,
      protocol: r.protocol,
      serviceName: r.serviceName || (r.dstPort >= 49152 ? 'Ephemeral / Other' : `Port ${r.dstPort}`),
      bytes: Number(r.bytes),
      direction,
      packets: Number(r.packets),
      tcpFlags: r.tcpFlags || '-',
      flowDurationMs: Number(r.flowDurationMs || 0),
    };
  });

  return { records, total };
}

let cachedNetflowOptions: { data: { protocols: string[]; services: string[] }; expiresAt: number } | null = null;

export function invalidateNetflowCache(): void {
  cachedNetflowOptions = null;
}

/**
 * Get distinct protocols and services for filter dropdowns (served from rollups with 60s TTL cache)
 */
export function getDistinctNetflowOptions(): { protocols: string[]; services: string[] } {
  const now = Date.now();
  if (cachedNetflowOptions && now < cachedNetflowOptions.expiresAt) {
    return cachedNetflowOptions.data;
  }

  const db = getDatabase();

  // Try reading from minute rollups first (orders of magnitude smaller than raw netflow_logs)
  try {
    const hasRollups = db.prepare('SELECT 1 FROM netflow_minute_rollups LIMIT 1').get();
    const sourceTable = hasRollups ? 'netflow_minute_rollups' : 'netflow_logs';

    const protoRows = db.prepare(`SELECT DISTINCT protocol FROM ${sourceTable} WHERE protocol IS NOT NULL ORDER BY protocol ASC`).all() as any[];
    const serviceRows = db.prepare(`
      SELECT service_name 
      FROM ${sourceTable} 
      WHERE service_name IS NOT NULL AND service_name != ''
      GROUP BY service_name 
      ORDER BY (CASE WHEN service_name NOT LIKE 'Port %' THEN 0 ELSE 1 END) ASC, count(*) DESC 
      LIMIT 30
    `).all() as any[];

    const result = {
      protocols: protoRows.length > 0 ? protoRows.map((r) => r.protocol) : ['TCP', 'UDP', 'ICMP'],
      services: serviceRows.length > 0 ? serviceRows.map((r) => r.service_name) : ['HTTPS', 'DNS', 'HTTP', 'SSH', 'RDP', 'SMB'],
    };

    cachedNetflowOptions = { data: result, expiresAt: now + 60000 };
    return result;
  } catch (err) {
    console.warn('Error reading distinct netflow options:', err);
    return {
      protocols: ['TCP', 'UDP', 'ICMP'],
      services: ['HTTPS', 'DNS', 'HTTP', 'SSH', 'RDP', 'SMB'],
    };
  }
}
