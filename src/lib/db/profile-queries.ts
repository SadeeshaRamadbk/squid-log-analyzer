import { getDatabase } from './index';
import { formatTimestamp, getSystemSettings, isInternalIp } from '../settings';

export interface IpProfileData {
  clientIp: string;
  mapping: {
    userName: string | null;
    department: string | null;
    notes: string | null;
    createdAt?: number;
    updatedAt?: number;
  };
  squid: {
    totalRequests: number;
    totalBytes: number;
    blockedCount: number;
    firstSeen: number | null;
    lastSeen: number | null;
    topDomains: Array<{
      domain: string;
      requestCount: number;
      bytes: number;
      blockedCount: number;
    }>;
    recentBlocked: Array<{
      id: number;
      timestamp: number;
      formattedTime: string;
      method: string;
      url: string;
      domain: string;
      resultCode: string;
    }>;
  };
  softflowd: {
    totalFlows: number;
    totalBytes: number;
    downloadBytes: number;
    uploadBytes: number;
    totalPackets: number;
    topDestinations: Array<{
      dstIp: string;
      bytes: number;
      flowCount: number;
    }>;
    topServices: Array<{
      serviceName: string;
      dstPort: number;
      protocol: string;
      bytes: number;
      flowCount: number;
    }>;
    recentFlows: Array<{
      id: number;
      timestamp: number;
      formattedTime: string;
      direction: 'download' | 'upload' | 'internal';
      remoteIp: string;
      port: number;
      protocol: string;
      serviceName: string;
      bytes: number;
      packets: number;
      tcpFlags: string;
    }>;
  };
  syslog: {
    totalEvents: number;
    firewallBlocks: number;
    recentEvents: Array<{
      id: number;
      timestamp: number;
      formattedTime: string;
      appName: string;
      severity: number;
      severityLabel: string;
      action?: string | null;
      message: string;
      srcIp?: string | null;
      dstIp?: string | null;
      dstPort?: number | null;
      protocol?: string | null;
      tcpFlags?: string | null;
    }>;
  };
}

export interface IpSearchResult {
  clientIp: string;
  userName: string | null;
  department: string | null;
  notes: string | null;
  totalSquidRequests: number;
  totalNetflowBytes: number;
}

/**
 * Get comprehensive dossier profile for a given IP address
 */
export function getIpProfile(targetIp: string): IpProfileData {
  const db = getDatabase();
  const cleanInput = targetIp.trim();
  const tz = getSystemSettings().timezone || 'Asia/Colombo';

  // 1. IP Mapping Info (support lookup by client_ip or employee user_name/alias)
  let resolvedIp = cleanInput;
  let mappingRow = db.prepare(`
    SELECT client_ip, user_name, department, notes, created_at, updated_at
    FROM ip_mappings
    WHERE client_ip = ?
  `).get(cleanInput) as any;

  if (!mappingRow) {
    const nameMatch = db.prepare(`
      SELECT client_ip, user_name, department, notes, created_at, updated_at
      FROM ip_mappings
      WHERE LOWER(user_name) = LOWER(?) OR LOWER(notes) LIKE LOWER(?)
      LIMIT 1
    `).get(cleanInput, `%${cleanInput}%`) as any;

    if (nameMatch) {
      mappingRow = nameMatch;
      resolvedIp = nameMatch.client_ip;
    }
  }

  const cleanIp = resolvedIp;

  const mapping = {
    userName: mappingRow?.user_name || null,
    department: mappingRow?.department || null,
    notes: mappingRow?.notes || null,
    createdAt: mappingRow?.created_at,
    updatedAt: mappingRow?.updated_at,
  };

  // 2. Squid Proxy (L7 HTTP/S) Activity
  const squidSummaryRow = db.prepare(`
    SELECT
      COALESCE(SUM(request_count), 0) AS totalRequests,
      COALESCE(SUM(bytes), 0) AS totalBytes,
      COALESCE(SUM(blocked_count), 0) AS blockedCount
    FROM daily_summaries
    WHERE client_ip = ?
  `).get(cleanIp) as any;

  let totalRequests = Number(squidSummaryRow?.totalRequests || 0);
  let totalSquidBytes = Number(squidSummaryRow?.totalBytes || 0);
  let blockedCount = Number(squidSummaryRow?.blockedCount || 0);

  // If daily_summaries has 0, fallback to raw_logs
  if (totalRequests === 0) {
    const rawSquidRow = db.prepare(`
      SELECT
        COUNT(*) AS totalRequests,
        COALESCE(SUM(bytes), 0) AS totalBytes,
        COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount
      FROM raw_logs
      WHERE client_ip = ?
    `).get(cleanIp) as any;

    totalRequests = Number(rawSquidRow?.totalRequests || 0);
    totalSquidBytes = Number(rawSquidRow?.totalBytes || 0);
    blockedCount = Number(rawSquidRow?.blockedCount || 0);
  }

  // First & Last seen in Squid raw_logs
  const timeSeenRow = db.prepare(`
    SELECT MIN(timestamp) AS firstSeen, MAX(timestamp) AS lastSeen
    FROM raw_logs
    WHERE client_ip = ?
  `).get(cleanIp) as any;

  // Top domains visited
  let topDomains = db.prepare(`
    SELECT
      domain,
      SUM(request_count) AS requestCount,
      SUM(bytes) AS bytes,
      SUM(blocked_count) AS blockedCount
    FROM daily_summaries
    WHERE client_ip = ?
    GROUP BY domain
    ORDER BY requestCount DESC
    LIMIT 10
  `).all(cleanIp) as any[];

  if (topDomains.length === 0) {
    topDomains = db.prepare(`
      SELECT
        domain,
        COUNT(*) AS requestCount,
        COALESCE(SUM(bytes), 0) AS bytes,
        COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount
      FROM raw_logs
      WHERE client_ip = ?
      GROUP BY domain
      ORDER BY requestCount DESC
      LIMIT 10
    `).all(cleanIp) as any[];
  }

  // Recent blocked requests
  const recentBlockedRows = db.prepare(`
    SELECT id, timestamp, method, url, domain, result_code AS resultCode
    FROM raw_logs
    WHERE client_ip = ? AND is_blocked = 1
    ORDER BY timestamp DESC
    LIMIT 10
  `).all(cleanIp) as any[];

  const recentBlocked = recentBlockedRows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    formattedTime: formatTimestamp(r.timestamp, tz),
    method: r.method,
    url: r.url || `${r.domain} (Blocked)`,
    domain: r.domain,
    resultCode: r.resultCode,
  }));

  // 3. pfSense softflowd (L3/L4 Telemetry) Activity
  const netflowSummaryRow = db.prepare(`
    SELECT
      COALESCE(SUM(flow_count), 0) AS totalFlows,
      COALESCE(SUM(bytes), 0) AS totalBytes,
      COALESCE(SUM(CASE WHEN dst_ip = ? THEN bytes ELSE 0 END), 0) AS downloadBytes,
      COALESCE(SUM(CASE WHEN src_ip = ? THEN bytes ELSE 0 END), 0) AS uploadBytes,
      COALESCE(SUM(packets), 0) AS totalPackets
    FROM netflow_daily_summaries
    WHERE src_ip = ? OR dst_ip = ?
  `).get(cleanIp, cleanIp, cleanIp, cleanIp) as any;

  let totalFlows = Number(netflowSummaryRow?.totalFlows || 0);
  let totalNetflowBytes = Number(netflowSummaryRow?.totalBytes || 0);
  let downloadBytes = Number(netflowSummaryRow?.downloadBytes || 0);
  let uploadBytes = Number(netflowSummaryRow?.uploadBytes || 0);
  let totalPackets = Number(netflowSummaryRow?.totalPackets || 0);

  // Fallback to netflow_logs if summaries are 0
  if (totalFlows === 0) {
    const rawFlowRow = db.prepare(`
      SELECT
        COUNT(*) AS totalFlows,
        COALESCE(SUM(bytes), 0) AS totalBytes,
        COALESCE(SUM(CASE WHEN dst_ip = ? THEN bytes ELSE 0 END), 0) AS downloadBytes,
        COALESCE(SUM(CASE WHEN src_ip = ? THEN bytes ELSE 0 END), 0) AS uploadBytes,
        COALESCE(SUM(packets), 0) AS totalPackets
      FROM netflow_logs
      WHERE src_ip = ? OR dst_ip = ?
    `).get(cleanIp, cleanIp, cleanIp, cleanIp) as any;

    totalFlows = Number(rawFlowRow?.totalFlows || 0);
    totalNetflowBytes = Number(rawFlowRow?.totalBytes || 0);
    downloadBytes = Number(rawFlowRow?.downloadBytes || 0);
    uploadBytes = Number(rawFlowRow?.uploadBytes || 0);
    totalPackets = Number(rawFlowRow?.totalPackets || 0);
  }

  // Top remote endpoints accessed by this IP
  let topDestinations = db.prepare(`
    WITH endpoint_flows AS (
      SELECT dst_ip AS remote_ip, bytes, flow_count FROM netflow_daily_summaries WHERE src_ip = ?
      UNION ALL
      SELECT src_ip AS remote_ip, bytes, flow_count FROM netflow_daily_summaries WHERE dst_ip = ?
    )
    SELECT remote_ip AS dstIp, SUM(bytes) AS bytes, SUM(flow_count) AS flowCount
    FROM endpoint_flows
    WHERE remote_ip != ? AND remote_ip IS NOT NULL AND remote_ip != ''
    GROUP BY remote_ip
    ORDER BY bytes DESC
    LIMIT 10
  `).all(cleanIp, cleanIp, cleanIp) as any[];

  if (topDestinations.length === 0) {
    topDestinations = db.prepare(`
      WITH endpoint_flows AS (
        SELECT dst_ip AS remote_ip, bytes, 1 AS flow_count FROM netflow_logs WHERE src_ip = ?
        UNION ALL
        SELECT src_ip AS remote_ip, bytes, 1 AS flow_count FROM netflow_logs WHERE dst_ip = ?
      )
      SELECT remote_ip AS dstIp, SUM(bytes) AS bytes, SUM(flow_count) AS flowCount
      FROM endpoint_flows
      WHERE remote_ip != ? AND remote_ip IS NOT NULL AND remote_ip != ''
      GROUP BY remote_ip
      ORDER BY bytes DESC
      LIMIT 10
    `).all(cleanIp, cleanIp, cleanIp) as any[];
  }

  // Top services used by this IP
  let topServices = db.prepare(`
    SELECT
      service_name AS serviceName,
      dst_port AS dstPort,
      protocol,
      SUM(bytes) AS bytes,
      SUM(flow_count) AS flowCount
    FROM netflow_daily_summaries
    WHERE src_ip = ? OR dst_ip = ?
    GROUP BY service_name, dst_port, protocol
    ORDER BY bytes DESC
    LIMIT 10
  `).all(cleanIp, cleanIp) as any[];

  if (topServices.length === 0) {
    topServices = db.prepare(`
      SELECT
        service_name AS serviceName,
        dst_port AS dstPort,
        protocol,
        COALESCE(SUM(bytes), 0) AS bytes,
        COUNT(*) AS flowCount
      FROM netflow_logs
      WHERE src_ip = ? OR dst_ip = ?
      GROUP BY service_name, dst_port, protocol
      ORDER BY bytes DESC
      LIMIT 10
    `).all(cleanIp, cleanIp) as any[];
  }

  // Recent raw flows for this IP
  const recentFlowRows = db.prepare(`
    SELECT
      id,
      timestamp,
      src_ip,
      dst_ip,
      src_port,
      dst_port,
      protocol,
      service_name,
      bytes,
      packets,
      tcp_flags
    FROM netflow_logs
    WHERE src_ip = ? OR dst_ip = ?
    ORDER BY timestamp DESC
    LIMIT 15
  `).all(cleanIp, cleanIp) as any[];

  const recentFlows = recentFlowRows.map((r) => {
    const isOutbound = r.src_ip === cleanIp;
    const direction: 'download' | 'upload' | 'internal' = isOutbound ? 'upload' : 'download';
    const remoteIp = isOutbound ? r.dst_ip : r.src_ip;
    const port = isOutbound ? r.dst_port : r.src_port;

    return {
      id: r.id,
      timestamp: r.timestamp,
      formattedTime: formatTimestamp(r.timestamp, tz),
      direction,
      remoteIp,
      port,
      protocol: r.protocol,
      serviceName: r.service_name || `Port ${port}`,
      bytes: Number(r.bytes),
      packets: Number(r.packets),
      tcpFlags: r.tcp_flags || '-',
    };
  });

  return {
    clientIp: cleanIp,
    mapping,
    squid: {
      totalRequests,
      totalBytes: totalSquidBytes,
      blockedCount,
      firstSeen: timeSeenRow?.firstSeen || null,
      lastSeen: timeSeenRow?.lastSeen || null,
      topDomains: topDomains.map((d) => ({
        domain: d.domain,
        requestCount: Number(d.requestCount),
        bytes: Number(d.bytes),
        blockedCount: Number(d.blockedCount),
      })),
      recentBlocked,
    },
    softflowd: {
      totalFlows,
      totalBytes: totalNetflowBytes,
      downloadBytes,
      uploadBytes,
      totalPackets,
      topDestinations: topDestinations.map((d) => ({
        dstIp: d.dstIp,
        bytes: Number(d.bytes),
        flowCount: Number(d.flowCount),
      })),
      topServices: topServices.map((s) => ({
        serviceName: s.serviceName || `Port ${s.dstPort}`,
        dstPort: Number(s.dstPort),
        protocol: s.protocol,
        bytes: Number(s.bytes),
        flowCount: Number(s.flowCount),
      })),
      recentFlows,
    },
    syslog: (() => {
      let totalEvents = 0;
      let firewallBlocks = 0;
      let recentEvents: any[] = [];

      try {
        const syslogSummaryRow = db.prepare(`
          SELECT
            count(*) AS totalEvents,
            SUM(CASE WHEN action IN ('block', 'reject') OR (app_name = 'filterlog' AND (message LIKE '%block%' OR message LIKE '%BLOCK%')) THEN 1 ELSE 0 END) AS firewallBlocks
          FROM syslog_events
          WHERE src_ip = ? OR dst_ip = ? OR message LIKE ?
        `).get(cleanIp, cleanIp, `%${cleanIp}%`) as any;

        totalEvents = Number(syslogSummaryRow?.totalEvents || 0);
        firewallBlocks = Number(syslogSummaryRow?.firewallBlocks || 0);

        const recentSyslogRows = db.prepare(`
          SELECT id, timestamp, app_name, severity, severity_label, action, message, src_ip, dst_ip, dst_port, protocol, tcp_flags
          FROM syslog_events
          WHERE src_ip = ? OR dst_ip = ? OR message LIKE ?
          ORDER BY timestamp DESC
          LIMIT 20
        `).all(cleanIp, cleanIp, `%${cleanIp}%`) as any[];

        recentEvents = recentSyslogRows.map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          formattedTime: formatTimestamp(r.timestamp, tz),
          appName: r.app_name,
          severity: r.severity,
          severityLabel: r.severity_label,
          action: r.action || (r.message.toUpperCase().includes('BLOCK') ? 'block' : null),
          message: r.message,
          srcIp: r.src_ip,
          dstIp: r.dst_ip,
          dstPort: r.dst_port,
          protocol: r.protocol,
          tcpFlags: r.tcp_flags,
        }));
      } catch (err) {
        console.warn('Error querying syslog for IP profile:', err);
      }

      return {
        totalEvents,
        firewallBlocks,
        recentEvents,
      };
    })(),
  };
}

/**
 * Global search across IP mappings and traffic records
 */
export function searchIps(term = ''): IpSearchResult[] {
  const db = getDatabase();
  const q = term.trim();
  const wildcard = `%${q}%`;

  // Get matching mappings
  const mappingRows = db.prepare(`
    SELECT client_ip, user_name, department, notes
    FROM ip_mappings
    WHERE ? = '' OR client_ip LIKE ? OR user_name LIKE ? OR department LIKE ?
    ORDER BY client_ip ASC
    LIMIT 30
  `).all(q, wildcard, wildcard, wildcard) as any[];

  const results: IpSearchResult[] = [];
  const seenIps = new Set<string>();

  for (const m of mappingRows) {
    seenIps.add(m.client_ip);
    // Quick summary
    const squidStat = db.prepare(`SELECT COALESCE(SUM(request_count), 0) as total FROM daily_summaries WHERE client_ip = ?`).get(m.client_ip) as any;
    const netflowStat = db.prepare(`SELECT COALESCE(SUM(bytes), 0) as total FROM netflow_daily_summaries WHERE src_ip = ? OR dst_ip = ?`).get(m.client_ip, m.client_ip) as any;

    results.push({
      clientIp: m.client_ip,
      userName: m.user_name || null,
      department: m.department || null,
      notes: m.notes || null,
      totalSquidRequests: Number(squidStat?.total || 0),
      totalNetflowBytes: Number(netflowStat?.total || 0),
    });
  }

  // Also search raw traffic for unmapped IPs matching term
  if (q.length >= 2) {
    const rawSquidIps = db.prepare(`
      SELECT DISTINCT client_ip
      FROM raw_logs
      WHERE client_ip LIKE ?
      LIMIT 10
    `).all(wildcard) as any[];

    for (const r of rawSquidIps) {
      if (!seenIps.has(r.client_ip)) {
        seenIps.add(r.client_ip);
        results.push({
          clientIp: r.client_ip,
          userName: null,
          department: null,
          notes: null,
          totalSquidRequests: 1,
          totalNetflowBytes: 0,
        });
      }
    }

    const rawNetflowIps = db.prepare(`
      SELECT DISTINCT src_ip as client_ip
      FROM netflow_logs
      WHERE src_ip LIKE ?
      LIMIT 10
    `).all(wildcard) as any[];

    for (const r of rawNetflowIps) {
      if (!seenIps.has(r.client_ip)) {
        seenIps.add(r.client_ip);
        results.push({
          clientIp: r.client_ip,
          userName: null,
          department: null,
          notes: null,
          totalSquidRequests: 0,
          totalNetflowBytes: 1,
        });
      }
    }
  }

  return results;
}

export interface GlobalSearchResult {
  ips: IpSearchResult[];
  domains: Array<{
    domain: string;
    totalRequests: number;
    blockedCount: number;
  }>;
  ports: Array<{
    port: number;
    protocol: string;
    serviceName: string;
    totalBytes: number;
    flowCount: number;
  }>;
}

export function searchGlobal(term: string): GlobalSearchResult {
  const db = getDatabase();
  const q = term.trim();
  const wildcard = `%${q}%`;

  const ips = searchIps(q);

  if (!q) {
    return { ips, domains: [], ports: [] };
  }

  // 1. Domains search
  let domains: Array<{ domain: string; totalRequests: number; blockedCount: number }> = [];
  try {
    const domainRows = db.prepare(`
      SELECT domain, COALESCE(SUM(request_count), 0) as totalRequests, COALESCE(SUM(blocked_count), 0) as blockedCount
      FROM daily_summaries
      WHERE domain LIKE ?
      GROUP BY domain
      ORDER BY totalRequests DESC
      LIMIT 8
    `).all(wildcard) as any[];

    if (domainRows.length > 0) {
      domains = domainRows.map((r) => ({
        domain: r.domain,
        totalRequests: Number(r.totalRequests || 0),
        blockedCount: Number(r.blockedCount || 0),
      }));
    } else {
      const rawDomainRows = db.prepare(`
        SELECT domain, COUNT(*) as totalRequests, COALESCE(SUM(is_blocked), 0) as blockedCount
        FROM raw_logs
        WHERE domain LIKE ?
        GROUP BY domain
        ORDER BY totalRequests DESC
        LIMIT 8
      `).all(wildcard) as any[];

      domains = rawDomainRows.map((r) => ({
        domain: r.domain,
        totalRequests: Number(r.totalRequests || 0),
        blockedCount: Number(r.blockedCount || 0),
      }));
    }
  } catch (err) {
    console.error('Domain search error:', err);
  }

  // 2. Ports and Services search
  let ports: Array<{ port: number; protocol: string; serviceName: string; totalBytes: number; flowCount: number }> = [];
  try {
    const portRows = db.prepare(`
      SELECT dst_port as port, protocol, COALESCE(service_name, 'Unknown') as serviceName,
             COALESCE(SUM(bytes), 0) as totalBytes, COALESCE(SUM(flow_count), 0) as flowCount
      FROM netflow_daily_summaries
      WHERE service_name LIKE ? OR CAST(dst_port AS TEXT) LIKE ?
      GROUP BY dst_port, protocol
      ORDER BY totalBytes DESC
      LIMIT 8
    `).all(wildcard, wildcard) as any[];

    if (portRows.length > 0) {
      ports = portRows.map((r) => ({
        port: Number(r.port),
        protocol: r.protocol,
        serviceName: r.serviceName,
        totalBytes: Number(r.totalBytes || 0),
        flowCount: Number(r.flowCount || 0),
      }));
    } else {
      const rawPortRows = db.prepare(`
        SELECT dst_port as port, protocol, COALESCE(service_name, 'Unknown') as serviceName,
               COALESCE(SUM(bytes), 0) as totalBytes, COUNT(*) as flowCount
        FROM netflow_logs
        WHERE service_name LIKE ? OR CAST(dst_port AS TEXT) LIKE ?
        GROUP BY dst_port, protocol
        ORDER BY totalBytes DESC
        LIMIT 8
      `).all(wildcard, wildcard) as any[];

      ports = rawPortRows.map((r) => ({
        port: Number(r.port),
        protocol: r.protocol,
        serviceName: r.serviceName,
        totalBytes: Number(r.totalBytes || 0),
        flowCount: Number(r.flowCount || 0),
      }));
    }
  } catch (err) {
    console.error('Port search error:', err);
  }

  return { ips, domains, ports };
}

export interface HostSummaryItem {
  clientIp: string;
  userName: string | null;
  department: string | null;
  notes: string | null;
  isMapped: boolean;

  squid: {
    totalRequests: number;
    totalBytes: number;
    blockedCount: number;
    topDomain: string | null;
  };

  netflow: {
    totalFlows: number;
    totalBytes: number;
    downloadBytes: number;
    uploadBytes: number;
    topService: string | null;
  };

  syslog: {
    totalEvents: number;
    firewallBlocks: number;
  };

  totalBandwidth: number;
  lastActive: number | null;
}

export interface HostsOverviewOptions {
  search?: string;
  department?: string;
  filter?: 'all' | 'mapped' | 'unmapped' | 'blocked' | 'firewall';
  sort?: 'bandwidth' | 'requests' | 'blocked' | 'firewall' | 'ip' | 'name' | 'activity';
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface HostsOverviewResult {
  hosts: HostSummaryItem[];
  totalFiltered: number;
  kpis: {
    totalHosts: number;
    mappedHosts: number;
    unmappedHosts: number;
    totalBandwidth: number;
    totalDownloadBytes: number;
    totalUploadBytes: number;
    totalSquidRequests: number;
    totalSquidBlocked: number;
    totalSyslogBlocks: number;
  };
  departments: string[];
}

export function getAllHostsOverview(options: HostsOverviewOptions = {}): HostsOverviewResult {
  const db = getDatabase();
  const hostMap = new Map<string, HostSummaryItem>();

  const getOrCreateHost = (ip: string): HostSummaryItem => {
    let item = hostMap.get(ip);
    if (!item) {
      item = {
        clientIp: ip,
        userName: null,
        department: null,
        notes: null,
        isMapped: false,
        squid: { totalRequests: 0, totalBytes: 0, blockedCount: 0, topDomain: null },
        netflow: { totalFlows: 0, totalBytes: 0, downloadBytes: 0, uploadBytes: 0, topService: null },
        syslog: { totalEvents: 0, firewallBlocks: 0 },
        totalBandwidth: 0,
        lastActive: null,
      };
      hostMap.set(ip, item);
    }
    return item;
  };

  // 1. Load known IP Mappings
  const mappingRows = db.prepare(`
    SELECT client_ip, user_name, department, notes, updated_at
    FROM ip_mappings
  `).all() as any[];

  for (const m of mappingRows) {
    const host = getOrCreateHost(m.client_ip);
    host.userName = m.user_name || null;
    host.department = m.department || null;
    host.notes = m.notes || null;
    host.isMapped = true;
    if (m.updated_at) {
      host.lastActive = m.updated_at;
    }
  }

  // 2. Load Squid Proxy Activity from daily_summaries
  try {
    const squidSummaryRows = db.prepare(`
      SELECT
        client_ip,
        COALESCE(SUM(request_count), 0) AS total_requests,
        COALESCE(SUM(bytes), 0) AS total_bytes,
        COALESCE(SUM(blocked_count), 0) AS blocked_count
      FROM daily_summaries
      GROUP BY client_ip
    `).all() as any[];

    for (const r of squidSummaryRows) {
      if (!isInternalIp(r.client_ip) && !hostMap.has(r.client_ip)) continue;
      const host = getOrCreateHost(r.client_ip);
      host.squid.totalRequests = Number(r.total_requests || 0);
      host.squid.totalBytes = Number(r.total_bytes || 0);
      host.squid.blockedCount = Number(r.blocked_count || 0);
    }

    // Top domain for each client_ip in daily_summaries
    const topDomainRows = db.prepare(`
      WITH ranked_domains AS (
        SELECT client_ip, domain, SUM(request_count) as req_count,
               ROW_NUMBER() OVER (PARTITION BY client_ip ORDER BY SUM(request_count) DESC) as rn
        FROM daily_summaries
        WHERE domain IS NOT NULL AND domain != ''
        GROUP BY client_ip, domain
      )
      SELECT client_ip, domain FROM ranked_domains WHERE rn = 1
    `).all() as any[];

    for (const td of topDomainRows) {
      const host = hostMap.get(td.client_ip);
      if (host) {
        host.squid.topDomain = td.domain;
      }
    }
  } catch (err) {
    console.warn('[Hosts] Squid summaries query note:', err);
  }

  // 3. Load NetFlow L3/L4 activity from netflow_daily_summaries (Internal LAN only)
  try {
    const netflowUploadRows = db.prepare(`
      SELECT src_ip as ip,
             COALESCE(SUM(bytes), 0) as upload_bytes,
             COALESCE(SUM(flow_count), 0) as upload_flows
      FROM netflow_daily_summaries
      WHERE src_ip LIKE '192.168.%' OR src_ip LIKE '10.%' OR src_ip LIKE '172.%'
      GROUP BY src_ip
    `).all() as any[];

    for (const u of netflowUploadRows) {
      if (!isInternalIp(u.ip) && !hostMap.has(u.ip)) continue;
      const host = getOrCreateHost(u.ip);
      host.netflow.uploadBytes = Number(u.upload_bytes || 0);
      host.netflow.totalFlows += Number(u.upload_flows || 0);
    }

    const netflowDownloadRows = db.prepare(`
      SELECT dst_ip as ip,
             COALESCE(SUM(bytes), 0) as download_bytes,
             COALESCE(SUM(flow_count), 0) as download_flows
      FROM netflow_daily_summaries
      WHERE dst_ip LIKE '192.168.%' OR dst_ip LIKE '10.%' OR dst_ip LIKE '172.%'
      GROUP BY dst_ip
    `).all() as any[];

    for (const d of netflowDownloadRows) {
      if (!isInternalIp(d.ip) && !hostMap.has(d.ip)) continue;
      const host = getOrCreateHost(d.ip);
      host.netflow.downloadBytes = Number(d.download_bytes || 0);
      host.netflow.totalFlows += Number(d.download_flows || 0);
    }

    // Top service for each internal IP
    const topServiceRows = db.prepare(`
      WITH ranked_services AS (
        SELECT src_ip as ip, service_name, SUM(bytes) as s_bytes,
               ROW_NUMBER() OVER (PARTITION BY src_ip ORDER BY SUM(bytes) DESC) as rn
        FROM netflow_daily_summaries
        WHERE (src_ip LIKE '192.168.%' OR src_ip LIKE '10.%' OR src_ip LIKE '172.%')
          AND service_name IS NOT NULL AND service_name != ''
        GROUP BY src_ip, service_name
      )
      SELECT ip, service_name FROM ranked_services WHERE rn = 1
    `).all() as any[];

    for (const ts of topServiceRows) {
      const host = hostMap.get(ts.ip);
      if (host) {
        host.netflow.topService = ts.service_name;
      }
    }
  } catch (err) {
    console.warn('[Hosts] NetFlow summaries query note:', err);
  }

  // 4. Load Syslog events & firewall blocks
  try {
    const syslogStats = db.prepare(`
      SELECT src_ip as ip,
             COUNT(*) as total_events,
             SUM(CASE WHEN action IN ('block', 'reject') OR message LIKE '%block%' THEN 1 ELSE 0 END) as firewall_blocks
      FROM syslog_events
      WHERE (src_ip LIKE '192.168.%' OR src_ip LIKE '10.%' OR src_ip LIKE '172.%')
        AND src_ip IS NOT NULL AND src_ip != ''
      GROUP BY src_ip
    `).all() as any[];

    for (const s of syslogStats) {
      if (!isInternalIp(s.ip) && !hostMap.has(s.ip)) continue;
      const host = getOrCreateHost(s.ip);
      host.syslog.totalEvents = Number(s.total_events || 0);
      host.syslog.firewallBlocks = Number(s.firewall_blocks || 0);
    }
  } catch (err) {
    console.warn('[Hosts] Syslog query note:', err);
  }

  // Calculate totals and compile hosts list
  const departmentsSet = new Set<string>();
  let totalBandwidthSum = 0;
  let totalDownloadSum = 0;
  let totalUploadSum = 0;
  let totalSquidReqsSum = 0;
  let totalSquidBlockedSum = 0;
  let totalSyslogBlocksSum = 0;
  let mappedCount = 0;

  const allHosts: HostSummaryItem[] = [];

  for (const host of hostMap.values()) {
    host.netflow.totalBytes = host.netflow.downloadBytes + host.netflow.uploadBytes;
    host.totalBandwidth = host.netflow.totalBytes > 0 ? host.netflow.totalBytes : host.squid.totalBytes;

    if (host.department) {
      departmentsSet.add(host.department);
    }
    if (host.isMapped) {
      mappedCount++;
    }

    totalBandwidthSum += host.totalBandwidth;
    totalDownloadSum += host.netflow.downloadBytes;
    totalUploadSum += host.netflow.uploadBytes;
    totalSquidReqsSum += host.squid.totalRequests;
    totalSquidBlockedSum += host.squid.blockedCount;
    totalSyslogBlocksSum += host.syslog.firewallBlocks;

    allHosts.push(host);
  }

  // Filtering
  let filtered = allHosts;

  // Search filter (IP, username, department, notes, top domain)
  if (options.search && options.search.trim().length > 0) {
    const term = options.search.trim().toLowerCase();
    filtered = filtered.filter((h) =>
      h.clientIp.toLowerCase().includes(term) ||
      (h.userName && h.userName.toLowerCase().includes(term)) ||
      (h.department && h.department.toLowerCase().includes(term)) ||
      (h.notes && h.notes.toLowerCase().includes(term)) ||
      (h.squid.topDomain && h.squid.topDomain.toLowerCase().includes(term)) ||
      (h.netflow.topService && h.netflow.topService.toLowerCase().includes(term))
    );
  }

  // Department filter
  if (options.department && options.department !== 'all') {
    if (options.department === 'unassigned') {
      filtered = filtered.filter((h) => !h.department);
    } else {
      filtered = filtered.filter((h) => h.department?.toLowerCase() === options.department?.toLowerCase());
    }
  }

  // Filter type
  if (options.filter) {
    switch (options.filter) {
      case 'mapped':
        filtered = filtered.filter((h) => h.isMapped);
        break;
      case 'unmapped':
        filtered = filtered.filter((h) => !h.isMapped);
        break;
      case 'blocked':
        filtered = filtered.filter((h) => h.squid.blockedCount > 0);
        break;
      case 'firewall':
        filtered = filtered.filter((h) => h.syslog.firewallBlocks > 0);
        break;
    }
  }

  // Sorting
  const sortKey = options.sort || 'bandwidth';
  const isAsc = options.direction === 'asc';

  filtered.sort((a, b) => {
    let diff = 0;
    switch (sortKey) {
      case 'bandwidth':
        diff = b.totalBandwidth - a.totalBandwidth;
        break;
      case 'requests':
        diff = b.squid.totalRequests - a.squid.totalRequests;
        break;
      case 'blocked':
        diff = b.squid.blockedCount - a.squid.blockedCount;
        break;
      case 'firewall':
        diff = b.syslog.firewallBlocks - a.syslog.firewallBlocks;
        break;
      case 'name':
        diff = (a.userName || 'zzz').localeCompare(b.userName || 'zzz');
        break;
      case 'ip': {
        const numA = a.clientIp.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
        const numB = b.clientIp.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
        diff = numA - numB;
        break;
      }
      default:
        diff = b.totalBandwidth - a.totalBandwidth;
        break;
    }
    return isAsc ? -diff : diff;
  });

  const totalFiltered = filtered.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    hosts: paginated,
    totalFiltered,
    kpis: {
      totalHosts: allHosts.length,
      mappedHosts: mappedCount,
      unmappedHosts: allHosts.length - mappedCount,
      totalBandwidth: totalBandwidthSum,
      totalDownloadBytes: totalDownloadSum,
      totalUploadBytes: totalUploadSum,
      totalSquidRequests: totalSquidReqsSum,
      totalSquidBlocked: totalSquidBlockedSum,
      totalSyslogBlocks: totalSyslogBlocksSum,
    },
    departments: Array.from(departmentsSet).sort(),
  };
}

