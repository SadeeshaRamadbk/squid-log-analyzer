/**
 * pfSense Filterlog Parser
 * Parses pfSense BSD/CSV filterlog packets into structured firewall log records.
 * Supports IPv4 and IPv6 over TCP, UDP, ICMP, and ICMPv6.
 */

export interface ParsedFilterlog {
  ruleNumber?: string;
  subRuleNumber?: string;
  anchor?: string;
  tracker?: string;
  interface: string;
  reason: string;
  action: 'pass' | 'block' | 'reject' | string;
  direction: 'in' | 'out' | string;
  ipVersion: 4 | 6;
  protocol: string;
  protocolId?: number;
  srcIp: string;
  dstIp: string;
  srcPort?: number;
  dstPort?: number;
  tcpFlags?: string;
  length?: number;
  raw: string;
}

/**
 * Normalizes pfSense TCP flags string (e.g. 'S', 'A', 'FA', 'PA', 'RA') into readable names
 */
export function formatPfSenseTcpFlags(flagsStr?: string): string {
  if (!flagsStr || flagsStr === '-') return '-';
  const flagMap: Record<string, string> = {
    F: 'FIN',
    S: 'SYN',
    R: 'RST',
    P: 'PSH',
    A: 'ACK',
    U: 'URG',
    E: 'ECE',
    C: 'CWR',
  };

  const letters = flagsStr.toUpperCase().split('');
  const mapped = letters.map((l) => flagMap[l] || l).filter(Boolean);
  return mapped.length > 0 ? mapped.join(',') : flagsStr;
}

/**
 * Parses a pfSense filterlog CSV string into a structured ParsedFilterlog object.
 * Returns null if the input string is not a valid filterlog CSV line.
 */
export function parseFilterlogCsv(csvPayload: string): ParsedFilterlog | null {
  if (!csvPayload) return null;

  // Split by comma
  const parts = csvPayload.split(',').map((p) => p.trim());
  if (parts.length < 9) {
    return null;
  }

  // Common header fields (0 to 8)
  // [0] ruleNumber, [1] subRuleNumber, [2] anchor, [3] tracker, [4] interface,
  // [5] reason, [6] action, [7] direction, [8] ipVersion
  const ruleNumber = parts[0] || undefined;
  const subRuleNumber = parts[1] || undefined;
  const anchor = parts[2] || undefined;
  const tracker = parts[3] || undefined;
  const iface = parts[4] || 'unknown';
  const reason = parts[5] || 'match';
  const action = (parts[6] || 'pass').toLowerCase();
  const direction = (parts[7] || 'in').toLowerCase();
  const ipVersionRaw = parts[8];

  if (ipVersionRaw === '4') {
    // IPv4 layout:
    // [9] tos, [10] ecn, [11] ttl, [12] id, [13] offset, [14] ipflags,
    // [15] protoId, [16] proto, [17] length, [18] srcIp, [19] dstIp
    if (parts.length < 20) {
      return null;
    }

    const protoId = parseInt(parts[15], 10) || undefined;
    const proto = (parts[16] || 'unknown').toLowerCase();
    const length = parseInt(parts[17], 10) || undefined;
    const srcIp = parts[18];
    const dstIp = parts[19];

    let srcPort: number | undefined;
    let dstPort: number | undefined;
    let tcpFlags: string | undefined;

    if (proto === 'tcp' && parts.length >= 24) {
      // [20] srcPort, [21] dstPort, [22] dataLen, [23] tcpFlags
      srcPort = parseInt(parts[20], 10) || undefined;
      dstPort = parseInt(parts[21], 10) || undefined;
      tcpFlags = formatPfSenseTcpFlags(parts[23]);
    } else if (proto === 'udp' && parts.length >= 22) {
      // [20] srcPort, [21] dstPort
      srcPort = parseInt(parts[20], 10) || undefined;
      dstPort = parseInt(parts[21], 10) || undefined;
    } else if (proto === 'icmp' && parts.length >= 21) {
      // [20] icmp_type or description
      tcpFlags = parts[20] || undefined;
    }

    return {
      ruleNumber,
      subRuleNumber,
      anchor,
      tracker,
      interface: iface,
      reason,
      action,
      direction,
      ipVersion: 4,
      protocol: proto.toUpperCase(),
      protocolId: protoId,
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      tcpFlags: tcpFlags || '-',
      length,
      raw: csvPayload,
    };
  } else if (ipVersionRaw === '6') {
    // IPv6 layout:
    // [9] class, [10] flowLabel, [11] hopLimit, [12] proto, [13] protoId,
    // [14] length, [15] srcIp, [16] dstIp
    if (parts.length < 17) {
      return null;
    }

    const proto = (parts[12] || 'unknown').toLowerCase();
    const protoId = parseInt(parts[13], 10) || undefined;
    const length = parseInt(parts[14], 10) || undefined;
    const srcIp = parts[15];
    const dstIp = parts[16];

    let srcPort: number | undefined;
    let dstPort: number | undefined;
    let tcpFlags: string | undefined;

    if (proto === 'tcp' && parts.length >= 21) {
      // [17] srcPort, [18] dstPort, [19] dataLen, [20] tcpFlags
      srcPort = parseInt(parts[17], 10) || undefined;
      dstPort = parseInt(parts[18], 10) || undefined;
      tcpFlags = formatPfSenseTcpFlags(parts[20]);
    } else if (proto === 'udp' && parts.length >= 19) {
      // [17] srcPort, [18] dstPort
      srcPort = parseInt(parts[17], 10) || undefined;
      dstPort = parseInt(parts[18], 10) || undefined;
    } else if ((proto.includes('icmp') || proto === 'ipv6-icmp') && parts.length >= 18) {
      tcpFlags = parts[17] || undefined;
    }

    return {
      ruleNumber,
      subRuleNumber,
      anchor,
      tracker,
      interface: iface,
      reason,
      action,
      direction,
      ipVersion: 6,
      protocol: proto.toUpperCase(),
      protocolId: protoId,
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      tcpFlags: tcpFlags || '-',
      length,
      raw: csvPayload,
    };
  }

  return null;
}
