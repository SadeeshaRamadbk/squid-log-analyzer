import { getDatabase } from './index';

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
  const cleanIp = targetIp.trim();

  // 1. IP Mapping Info
  const mappingRow = db.prepare(`
    SELECT client_ip, user_name, department, notes, created_at, updated_at
    FROM ip_mappings
    WHERE client_ip = ?
  `).get(cleanIp) as any;

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
    formattedTime: new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 19),
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
      formattedTime: new Date(r.timestamp).toISOString().replace('T', ' ').substring(0, 19),
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

