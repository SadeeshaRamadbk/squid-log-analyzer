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
  action?: string | null;
  interface?: string | null;
  direction?: string | null;
  protocol?: string | null;
  src_ip?: string | null;
  dst_ip?: string | null;
  src_port?: number | null;
  dst_port?: number | null;
  tcp_flags?: string | null;
}

export interface SyslogQueryParams {
  page?: number;
  limit?: number;
  severity?: number | number[];
  severityLevel?: 'all' | 'errors' | 'warnings' | 'notices' | 'info';
  action?: string;
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
  firewallBlocks: number;
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

  if (params.action) {
    conditions.push('action = ?');
    queryParams.push(params.action.toLowerCase().trim());
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
           hostname, app_name, proc_id, message, raw_message,
           action, interface, direction, protocol, src_ip, dst_ip, src_port, dst_port, tcp_flags
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
      SUM(CASE WHEN severity = 7 THEN 1 ELSE 0 END) AS debug,
      SUM(CASE WHEN action IN ('block', 'reject') OR (app_name = 'filterlog' AND message LIKE '%BLOCK%') THEN 1 ELSE 0 END) AS firewall_blocks
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
    firewallBlocks: countsRow?.firewall_blocks || 0,
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

export interface FirewallBlockStatItem {
  key: string;
  count: number;
  sublabel?: string;
  lastSeen?: number;
}

export interface FirewallPortItem {
  port: number;
  protocol: string;
  service: string;
  count: number;
}

export interface FirewallInterfaceItem {
  interface: string;
  direction: string;
  count: number;
}

export interface FirewallTrackerItem {
  tracker: string;
  count: number;
}

export interface FirewallBlocksOverview {
  totalBlocks: number;
  suppressedNoiseCount: number;
  actionableBlocks: number;
  uniqueSources: number;
  uniqueDestinations: number;
  topSources: FirewallBlockStatItem[];
  topDestinations: FirewallBlockStatItem[];
  topPorts: FirewallPortItem[];
  interfaces: FirewallInterfaceItem[];
  trackers: FirewallTrackerItem[];
}

const WELL_KNOWN_PORTS: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  123: 'NTP',
  135: 'MS RPC',
  137: 'NetBIOS Name',
  138: 'NetBIOS Datagram',
  139: 'NetBIOS Session',
  443: 'HTTPS',
  445: 'SMB / IPC',
  1433: 'MS SQL Server',
  1900: 'SSDP Multicast',
  3306: 'MySQL',
  3389: 'RDP Remote Desktop',
  5353: 'mDNS Multicast',
  8080: 'HTTP Proxy/Alt',
  8443: 'HTTPS Alt',
};

/**
 * Fetch parsed firewall blocks analysis with noise suppression
 */
export function getFirewallBlockStats(params: {
  startDate?: string;
  endDate?: string;
  timeWindow?: string;
  suppressNoise?: boolean;
} = {}): FirewallBlocksOverview {
  const db = getDatabase();
  const { startMs, endMs } = resolveTimeRange(params);
  const suppress = params.suppressNoise !== false; // default to true

  const baseConditions: string[] = [
    "(action IN ('block', 'reject') OR (app_name = 'filterlog' AND (message LIKE '%block%' OR message LIKE '%BLOCK%')))"
  ];
  const queryParams: any[] = [];

  if (startMs !== undefined) {
    baseConditions.push('timestamp >= ?');
    queryParams.push(startMs);
  }
  if (endMs !== undefined) {
    baseConditions.push('timestamp <= ?');
    queryParams.push(endMs);
  }

  const baseWhere = `WHERE ${baseConditions.join(' AND ')}`;

  // Noise conditions (SSDP, late RST/ACK, broadcast, mDNS)
  const noiseClause = `
    (
      (dst_ip = '239.255.255.250' AND dst_port = 1900)
      OR (tcp_flags LIKE '%RST%' AND (tcp_flags LIKE '%ACK%' OR tcp_flags = 'RST'))
      OR (dst_ip = '255.255.255.255' OR dst_ip LIKE '%.255')
      OR (dst_ip = '224.0.0.251' AND dst_port = 5353)
      OR (dst_port IN (137, 138) AND (dst_ip = '255.255.255.255' OR dst_ip LIKE '%.255'))
    )
  `;

  // Total blocks and noise counts
  const countRow = db.prepare(`
    SELECT
      count(*) AS total_blocks,
      SUM(CASE WHEN ${noiseClause} THEN 1 ELSE 0 END) AS noise_blocks,
      COUNT(DISTINCT src_ip) AS total_sources,
      COUNT(DISTINCT dst_ip) AS total_destinations
    FROM syslog_events
    ${baseWhere}
  `).get(...queryParams) as any;

  const totalBlocks = countRow?.total_blocks || 0;
  const suppressedNoiseCount = countRow?.noise_blocks || 0;
  const actionableBlocks = Math.max(0, totalBlocks - suppressedNoiseCount);

  // Active where clause for breakdowns
  const activeConditions = [...baseConditions];
  if (suppress) {
    activeConditions.push(`NOT ${noiseClause}`);
  }
  const activeWhere = `WHERE ${activeConditions.join(' AND ')}`;

  // 1. Top Blocked Sources (with employee alias join)
  const topSourcesRows = db.prepare(`
    SELECT
      s.src_ip AS ip,
      count(*) AS count,
      MAX(s.timestamp) AS last_seen,
      m.user_name AS user_name,
      m.department AS department
    FROM syslog_events s
    LEFT JOIN ip_mappings m ON s.src_ip = m.client_ip
    ${activeWhere} AND s.src_ip IS NOT NULL AND s.src_ip != ''
    GROUP BY s.src_ip
    ORDER BY count DESC
    LIMIT 10
  `).all(...queryParams) as any[];

  const topSources: FirewallBlockStatItem[] = topSourcesRows.map((r) => ({
    key: r.ip,
    count: r.count,
    sublabel: r.user_name ? `${r.user_name}${r.department ? ` (${r.department})` : ''}` : undefined,
    lastSeen: r.last_seen,
  }));

  // 2. Top Blocked Destinations
  const topDestRows = db.prepare(`
    SELECT
      dst_ip AS ip,
      count(*) AS count,
      MAX(timestamp) AS last_seen
    FROM syslog_events
    ${activeWhere} AND dst_ip IS NOT NULL AND dst_ip != ''
    GROUP BY dst_ip
    ORDER BY count DESC
    LIMIT 10
  `).all(...queryParams) as any[];

  const topDestinations: FirewallBlockStatItem[] = topDestRows.map((r) => ({
    key: r.ip,
    count: r.count,
    lastSeen: r.last_seen,
  }));

  // 3. Top Blocked Ports
  const topPortsRows = db.prepare(`
    SELECT
      dst_port,
      protocol,
      count(*) AS count
    FROM syslog_events
    ${activeWhere} AND dst_port IS NOT NULL AND dst_port > 0
    GROUP BY dst_port, protocol
    ORDER BY count DESC
    LIMIT 10
  `).all(...queryParams) as any[];

  const topPorts: FirewallPortItem[] = topPortsRows.map((r) => ({
    port: r.dst_port,
    protocol: r.protocol || 'TCP',
    service: WELL_KNOWN_PORTS[r.dst_port] || 'Other Service',
    count: r.count,
  }));

  // 4. Interface Breakdown
  const ifaceRows = db.prepare(`
    SELECT
      COALESCE(interface, 'unknown') AS interface,
      COALESCE(direction, 'in') AS direction,
      count(*) AS count
    FROM syslog_events
    ${activeWhere}
    GROUP BY interface, direction
    ORDER BY count DESC
  `).all(...queryParams) as any[];

  const interfaces: FirewallInterfaceItem[] = ifaceRows.map((r) => ({
    interface: r.interface,
    direction: r.direction,
    count: r.count,
  }));

  // 5. Rule Tracker Hits
  const trackerRows = db.prepare(`
    SELECT
      COALESCE(proc_id, 'Default Deny') AS tracker,
      count(*) AS count
    FROM syslog_events
    ${activeWhere}
    GROUP BY tracker
    ORDER BY count DESC
    LIMIT 8
  `).all(...queryParams) as any[];

  const trackers: FirewallTrackerItem[] = trackerRows.map((r) => ({
    tracker: r.tracker,
    count: r.count,
  }));

  return {
    totalBlocks,
    suppressedNoiseCount,
    actionableBlocks,
    uniqueSources: countRow?.total_sources || 0,
    uniqueDestinations: countRow?.total_destinations || 0,
    topSources,
    topDestinations,
    topPorts,
    interfaces,
    trackers,
  };
}
