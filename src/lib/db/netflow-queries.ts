import { getDatabase } from './index';

export interface NetflowFilters {
  startDate?: string;
  endDate?: string;
  srcIp?: string;
  dstIp?: string;
  protocol?: string;
  serviceName?: string;
  timeWindow?: '30m' | '1h';
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

export interface NetflowTimeSeriesPoint {
  date: string;
  flowCount: number;
  bytes: number;
  downloadBytes: number;
  uploadBytes: number;
  packets: number;
}

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

/**
 * Check if an IPv4 address is an RFC 1918 internal address
 */
export function isInternalIp(ip: string): boolean {
  if (!ip) return false;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    return second >= 16 && second <= 31;
  }
  return false;
}

// SQL fragments for determining internal vs external traffic
const IS_SRC_INTERNAL = `(src_ip LIKE '10.%' OR src_ip LIKE '192.168.%' OR src_ip LIKE '172.16.%' OR src_ip LIKE '172.17.%' OR src_ip LIKE '172.18.%' OR src_ip LIKE '172.19.%' OR src_ip LIKE '172.2%.' OR src_ip LIKE '172.30.%' OR src_ip LIKE '172.31.%')`;
const IS_DST_INTERNAL = `(dst_ip LIKE '10.%' OR dst_ip LIKE '192.168.%' OR dst_ip LIKE '172.16.%' OR dst_ip LIKE '172.17.%' OR dst_ip LIKE '172.18.%' OR dst_ip LIKE '172.19.%' OR dst_ip LIKE '172.2%.' OR dst_ip LIKE '172.30.%' OR dst_ip LIKE '172.31.%')`;

function getCutoff(timeWindow?: string): number | null {
  if (timeWindow === '30m') return Date.now() - 30 * 60 * 1000;
  if (timeWindow === '1h') return Date.now() - 60 * 60 * 1000;
  return null;
}

/**
 * Get NetFlow Overview KPI Metrics (Total, Download, Upload)
 */
export function getNetflowMetrics(filters: NetflowFilters = {}): NetflowSummaryMetrics {
  const db = getDatabase();
  const cutoff = getCutoff(filters.timeWindow);

  let uploadCase = `CASE WHEN ${IS_SRC_INTERNAL} AND NOT ${IS_DST_INTERNAL} THEN bytes ELSE 0 END`;
  let downloadCase = `CASE WHEN ${IS_DST_INTERNAL} AND NOT ${IS_SRC_INTERNAL} THEN bytes ELSE 0 END`;

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];

    if (filters.srcIp?.trim()) {
      const ip = filters.srcIp.trim();
      conditions.push('(src_ip = ? OR dst_ip = ?)');
      params.push(ip, ip);
      uploadCase = `CASE WHEN src_ip = '${ip}' THEN bytes ELSE 0 END`;
      downloadCase = `CASE WHEN dst_ip = '${ip}' THEN bytes ELSE 0 END`;
    }
    if (filters.dstIp?.trim()) {
      conditions.push('dst_ip = ?');
      params.push(filters.dstIp.trim());
    }
    if (filters.protocol?.trim()) {
      conditions.push('protocol = ?');
      params.push(filters.protocol.trim());
    }
    if (filters.serviceName?.trim()) {
      conditions.push('service_name = ?');
      params.push(filters.serviceName.trim());
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const query = `
      SELECT
        COUNT(*) AS totalFlows,
        COALESCE(SUM(bytes), 0) AS totalBytes,
        COALESCE(SUM(${uploadCase}), 0) AS uploadBytes,
        COALESCE(SUM(${downloadCase}), 0) AS downloadBytes,
        COALESCE(SUM(packets), 0) AS totalPackets,
        COUNT(DISTINCT src_ip) AS uniqueSrcIps,
        COUNT(DISTINCT dst_ip) AS uniqueDstIps
      FROM netflow_logs
      ${where}
    `;
    const row = db.prepare(query).get(...params) as any;

    const protoRow = db.prepare(`SELECT protocol FROM netflow_logs ${where} GROUP BY protocol ORDER BY COUNT(*) DESC LIMIT 1`).get(...params) as any;

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

  // Multi-day / Historical from summaries
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.startDate) {
    conditions.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('date <= ?');
    params.push(filters.endDate);
  }
  if (filters.srcIp?.trim()) {
    const ip = filters.srcIp.trim();
    conditions.push('(src_ip = ? OR dst_ip = ?)');
    params.push(ip, ip);
    uploadCase = `CASE WHEN src_ip = '${ip}' THEN bytes ELSE 0 END`;
    downloadCase = `CASE WHEN dst_ip = '${ip}' THEN bytes ELSE 0 END`;
  }
  if (filters.dstIp?.trim()) {
    conditions.push('dst_ip = ?');
    params.push(filters.dstIp.trim());
  }
  if (filters.protocol?.trim()) {
    conditions.push('protocol = ?');
    params.push(filters.protocol.trim());
  }
  if (filters.serviceName?.trim()) {
    conditions.push('service_name = ?');
    params.push(filters.serviceName.trim());
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
    FROM netflow_daily_summaries
    ${where}
  `;
  const row = db.prepare(query).get(...params) as any;
  const protoRow = db.prepare(`SELECT protocol FROM netflow_daily_summaries ${where} GROUP BY protocol ORDER BY SUM(flow_count) DESC LIMIT 1`).get(...params) as any;

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
 * Get NetFlow Throughput Time Series with Upload & Download
 */
export function getNetflowThroughput(filters: NetflowFilters = {}): NetflowTimeSeriesPoint[] {
  const db = getDatabase();
  const cutoff = getCutoff(filters.timeWindow);

  let uploadCase = `CASE WHEN ${IS_SRC_INTERNAL} AND NOT ${IS_DST_INTERNAL} THEN bytes ELSE 0 END`;
  let downloadCase = `CASE WHEN ${IS_DST_INTERNAL} AND NOT ${IS_SRC_INTERNAL} THEN bytes ELSE 0 END`;

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];

    if (filters.srcIp?.trim()) {
      const ip = filters.srcIp.trim();
      conditions.push('(src_ip = ? OR dst_ip = ?)');
      params.push(ip, ip);
      uploadCase = `CASE WHEN src_ip = '${ip}' THEN bytes ELSE 0 END`;
      downloadCase = `CASE WHEN dst_ip = '${ip}' THEN bytes ELSE 0 END`;
    }
    if (filters.dstIp?.trim()) {
      conditions.push('dst_ip = ?');
      params.push(filters.dstIp.trim());
    }
    if (filters.protocol?.trim()) {
      conditions.push('protocol = ?');
      params.push(filters.protocol.trim());
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const query = `
      SELECT
        strftime('%H:%M', timestamp / 1000, 'unixepoch', 'localtime') AS date,
        COUNT(*) AS flowCount,
        COALESCE(SUM(bytes), 0) AS bytes,
        COALESCE(SUM(${uploadCase}), 0) AS uploadBytes,
        COALESCE(SUM(${downloadCase}), 0) AS downloadBytes,
        COALESCE(SUM(packets), 0) AS packets
      FROM netflow_logs
      ${where}
      GROUP BY date
      ORDER BY MIN(timestamp) ASC
    `;
    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      date: r.date,
      flowCount: Number(r.flowCount),
      bytes: Number(r.bytes),
      uploadBytes: Number(r.uploadBytes),
      downloadBytes: Number(r.downloadBytes),
      packets: Number(r.packets),
    }));
  }

  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.startDate) {
    conditions.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('date <= ?');
    params.push(filters.endDate);
  }
  if (filters.srcIp?.trim()) {
    const ip = filters.srcIp.trim();
    conditions.push('(src_ip = ? OR dst_ip = ?)');
    params.push(ip, ip);
    uploadCase = `CASE WHEN src_ip = '${ip}' THEN bytes ELSE 0 END`;
    downloadCase = `CASE WHEN dst_ip = '${ip}' THEN bytes ELSE 0 END`;
  }
  if (filters.dstIp?.trim()) {
    conditions.push('dst_ip = ?');
    params.push(filters.dstIp.trim());
  }
  if (filters.protocol?.trim()) {
    conditions.push('protocol = ?');
    params.push(filters.protocol.trim());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT
      date,
      COALESCE(SUM(flow_count), 0) AS flowCount,
      COALESCE(SUM(bytes), 0) AS bytes,
      COALESCE(SUM(${uploadCase}), 0) AS uploadBytes,
      COALESCE(SUM(${downloadCase}), 0) AS downloadBytes,
      COALESCE(SUM(packets), 0) AS packets
    FROM netflow_daily_summaries
    ${where}
    GROUP BY date
    ORDER BY date ASC
  `;
  const rows = db.prepare(query).all(...params) as any[];
  return rows.map((r) => ({
    date: r.date,
    flowCount: Number(r.flowCount),
    bytes: Number(r.bytes),
    uploadBytes: Number(r.uploadBytes),
    downloadBytes: Number(r.downloadBytes),
    packets: Number(r.packets),
  }));
}

/**
 * Get Top Talkers (Internal Hosts & Users) with Upload and Download breakdown
 */
export function getTopTalkers(filters: NetflowFilters = {}, limit = 10): TopTalkerRecord[] {
  const db = getDatabase();
  const cutoff = getCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];
    if (filters.protocol?.trim()) {
      conditions.push('protocol = ?');
      params.push(filters.protocol.trim());
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM netflow_logs ${where}`).get(...params) as any;
    const totalBytes = Number(totalRow?.totalBytes || 0);

    const query = `
      WITH unified AS (
        SELECT src_ip AS client_ip, bytes AS upload_bytes, 0 AS download_bytes, 1 AS flow_count, packets
        FROM netflow_logs
        ${where} AND ${IS_SRC_INTERNAL}
        UNION ALL
        SELECT dst_ip AS client_ip, 0 AS upload_bytes, bytes AS download_bytes, 1 AS flow_count, packets
        FROM netflow_logs
        ${where} AND ${IS_DST_INTERNAL}
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

  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.startDate) {
    conditions.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('date <= ?');
    params.push(filters.endDate);
  }
  if (filters.protocol?.trim()) {
    conditions.push('protocol = ?');
    params.push(filters.protocol.trim());
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM netflow_daily_summaries ${where}`).get(...params) as any;
  const totalBytes = Number(totalRow?.totalBytes || 0);

  const query = `
    WITH unified AS (
      SELECT src_ip AS client_ip, bytes AS upload_bytes, 0 AS download_bytes, flow_count, packets
      FROM netflow_daily_summaries
      ${where ? where + ' AND' : 'WHERE'} ${IS_SRC_INTERNAL}
      UNION ALL
      SELECT dst_ip AS client_ip, 0 AS upload_bytes, bytes AS download_bytes, flow_count, packets
      FROM netflow_daily_summaries
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
 * Get Top Destinations (Remote Endpoints)
 */
export function getTopDestinations(filters: NetflowFilters = {}, limit = 10): TopDestinationRecord[] {
  const db = getDatabase();
  const cutoff = getCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];
    if (filters.dstIp?.trim()) {
      conditions.push('dst_ip = ?');
      params.push(filters.dstIp.trim());
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM netflow_logs ${where}`).get(...params) as any;
    const totalBytes = Number(totalRow?.totalBytes || 0);

    const query = `
      SELECT
        dst_ip AS dstIp,
        COUNT(*) AS flowCount,
        COALESCE(SUM(bytes), 0) AS bytes,
        COALESCE(SUM(packets), 0) AS packets
      FROM netflow_logs
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
    }));
  }

  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.startDate) {
    conditions.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('date <= ?');
    params.push(filters.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM netflow_daily_summaries ${where}`).get(...params) as any;
  const totalBytes = Number(totalRow?.totalBytes || 0);

  const query = `
    SELECT
      dst_ip AS dstIp,
      SUM(flow_count) AS flowCount,
      SUM(bytes) AS bytes,
      SUM(packets) AS packets
    FROM netflow_daily_summaries
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
  }));
}

/**
 * Get Top Services & Ports
 */
export function getTopServices(filters: NetflowFilters = {}, limit = 10): TopServiceRecord[] {
  const db = getDatabase();
  const cutoff = getCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const conditions = ['timestamp >= ?'];
    const params: any[] = [cutoff];

    const where = `WHERE ${conditions.join(' AND ')}`;
    const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM netflow_logs ${where}`).get(...params) as any;
    const totalBytes = Number(totalRow?.totalBytes || 0);

    const query = `
      SELECT
        dst_port AS dstPort,
        service_name AS serviceName,
        protocol,
        COUNT(*) AS flowCount,
        COALESCE(SUM(bytes), 0) AS bytes
      FROM netflow_logs
      ${where}
      GROUP BY dst_port, protocol
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

  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.startDate) {
    conditions.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('date <= ?');
    params.push(filters.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM netflow_daily_summaries ${where}`).get(...params) as any;
  const totalBytes = Number(totalRow?.totalBytes || 0);

  const query = `
    SELECT
      dst_port AS dstPort,
      service_name AS serviceName,
      protocol,
      SUM(flow_count) AS flowCount,
      SUM(bytes) AS bytes
    FROM netflow_daily_summaries
    ${where}
    GROUP BY dst_port, protocol
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
 * Get Protocol Distribution (TCP vs UDP vs ICMP)
 */
export function getProtocolDistribution(filters: NetflowFilters = {}): ProtocolStatRecord[] {
  const db = getDatabase();
  const cutoff = getCutoff(filters.timeWindow);

  if (cutoff !== null) {
    const where = 'WHERE timestamp >= ?';
    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM netflow_logs ${where}`).get(cutoff) as any;
    const total = Number(totalRow?.total || 0);

    const rows = db.prepare(`
      SELECT protocol, COUNT(*) as flowCount, COALESCE(SUM(bytes), 0) as bytes
      FROM netflow_logs
      ${where}
      GROUP BY protocol
      ORDER BY flowCount DESC
    `).all(cutoff) as any[];

    return rows.map((r) => ({
      protocol: r.protocol,
      flowCount: Number(r.flowCount),
      bytes: Number(r.bytes),
      percentage: total > 0 ? Math.round((Number(r.flowCount) / total) * 1000) / 10 : 0,
    }));
  }

  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.startDate) {
    conditions.push('date >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('date <= ?');
    params.push(filters.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT COALESCE(SUM(flow_count), 0) as total FROM netflow_daily_summaries ${where}`).get(...params) as any;
  const total = Number(totalRow?.total || 0);

  const rows = db.prepare(`
    SELECT protocol, SUM(flow_count) as flowCount, SUM(bytes) as bytes
    FROM netflow_daily_summaries
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
  const conditions: string[] = [];
  const params: any[] = [];
  const cutoff = getCutoff(filters.timeWindow);

  if (cutoff !== null) {
    conditions.push('r.timestamp >= ?');
    params.push(cutoff);
  } else {
    if (filters.startDate) {
      const startMs = new Date(`${filters.startDate}T00:00:00Z`).getTime();
      conditions.push('r.timestamp >= ?');
      params.push(startMs);
    }
    if (filters.endDate) {
      const endMs = new Date(`${filters.endDate}T23:59:59.999Z`).getTime();
      conditions.push('r.timestamp <= ?');
      params.push(endMs);
    }
  }

  if (filters.srcIp?.trim()) {
    const ip = filters.srcIp.trim();
    conditions.push('(r.src_ip = ? OR r.dst_ip = ?)');
    params.push(ip, ip);
  }
  if (filters.dstIp?.trim()) {
    conditions.push('r.dst_ip = ?');
    params.push(filters.dstIp.trim());
  }
  if (filters.protocol?.trim()) {
    conditions.push('r.protocol = ?');
    params.push(filters.protocol.trim());
  }

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
      formattedTime: new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 19),
      srcIp: r.srcIp,
      userName: r.userName || null,
      department: r.department || null,
      dstIp: r.dstIp,
      srcPort: r.srcPort,
      dstPort: r.dstPort,
      protocol: r.protocol,
      serviceName: r.serviceName || `Port ${r.dstPort}`,
      bytes: Number(r.bytes),
      direction,
      packets: Number(r.packets),
      tcpFlags: r.tcpFlags || '-',
      flowDurationMs: Number(r.flowDurationMs || 0),
    };
  });

  return { records, total };
}

/**
 * Get distinct protocols and services for filter dropdowns
 */
export function getDistinctNetflowOptions(): { protocols: string[]; services: string[] } {
  const db = getDatabase();
  const protoRows = db.prepare('SELECT DISTINCT protocol FROM netflow_logs ORDER BY protocol ASC').all() as any[];
  const serviceRows = db.prepare('SELECT DISTINCT service_name FROM netflow_logs WHERE service_name IS NOT NULL ORDER BY service_name ASC').all() as any[];

  return {
    protocols: protoRows.map((r) => r.protocol),
    services: serviceRows.map((r) => r.service_name),
  };
}
