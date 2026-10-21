import { parseFilterlogCsv, ParsedFilterlog } from './filterlog-parser';

export interface ParsedSyslogEvent {
  timestamp: number;
  facility: number;
  facility_label: string;
  severity: number;
  severity_label: string;
  hostname: string;
  app_name: string;
  proc_id?: string | null;
  message: string;
  raw_message: string;
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

export const FACILITY_LABELS: Record<number, string> = {
  0: 'kernel',
  1: 'user',
  2: 'mail',
  3: 'daemon',
  4: 'auth',
  5: 'syslog',
  6: 'lpr',
  7: 'news',
  8: 'uucp',
  9: 'cron',
  10: 'authpriv',
  11: 'ftp',
  12: 'ntp',
  13: 'security',
  14: 'console',
  15: 'cron2',
  16: 'local0',
  17: 'local1',
  18: 'local2',
  19: 'local3',
  20: 'local4',
  21: 'local5',
  22: 'local6',
  23: 'local7',
};

export const SEVERITY_LABELS: Record<number, string> = {
  0: 'emergency',
  1: 'alert',
  2: 'critical',
  3: 'error',
  4: 'warning',
  5: 'notice',
  6: 'info',
  7: 'debug',
};

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parses BSD style timestamps like "Oct 21 13:15:02" or ISO 8601 timestamps
 */
export function parseSyslogTimestamp(timeStr: string): number {
  if (!timeStr) return Date.now();

  // Try ISO 8601 parse first (RFC 5424)
  if (timeStr.includes('-') || timeStr.includes('T')) {
    const parsed = Date.parse(timeStr);
    if (!isNaN(parsed)) return parsed;
  }

  // RFC 3164 BSD timestamp: "Mmm dd hh:mm:ss"
  const bsdMatch = timeStr.trim().match(/^([A-Za-z]{3})\s+(\d+)\s+(\d{2}):(\d{2}):(\d{2})/);
  if (bsdMatch) {
    const month = MONTH_MAP[bsdMatch[1].toLowerCase()];
    const day = parseInt(bsdMatch[2], 10);
    const hour = parseInt(bsdMatch[3], 10);
    const minute = parseInt(bsdMatch[4], 10);
    const second = parseInt(bsdMatch[5], 10);

    if (month !== undefined && !isNaN(day)) {
      const now = new Date();
      let year = now.getFullYear();

      // Handle year wrap if log is from Dec and current date is Jan
      if (now.getMonth() === 0 && month === 11) {
        year -= 1;
      }

      const date = new Date(year, month, day, hour, minute, second);
      return date.getTime();
    }
  }

  return Date.now();
}

/**
 * Parses raw syslog UDP message string into structured event
 */
export function parseSyslogMessage(rawInput: string, remoteAddress?: string): ParsedSyslogEvent {
  const raw = rawInput.trim();
  let pri = 13; // default: facility 1 (user), severity 5 (notice) -> (1 * 8) + 5 = 13
  let payload = raw;

  // 1. Extract PRI code (<PRI>)
  const priMatch = raw.match(/^<(\d{1,3})>([\s\S]*)$/);
  if (priMatch) {
    pri = parseInt(priMatch[1], 10);
    payload = priMatch[2].trim();
  }

  const facility = Math.min(23, Math.max(0, Math.floor(pri / 8)));
  let severity = Math.min(7, Math.max(0, pri % 8));
  const facility_label = FACILITY_LABELS[facility] || 'daemon';
  let severity_label = SEVERITY_LABELS[severity] || 'info';

  let timestamp = Date.now();
  let hostname = remoteAddress || 'pfsense';
  let app_name = 'system';
  let proc_id: string | null = null;
  let message = payload;

  // 2. Check for RFC 5424 (starts with version digit right after PRI, e.g. "1 2026-10-21T...")
  const rfc5424Match = payload.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*(?:\[.*?\])?\s*([\s\S]*)$/);
  if (rfc5424Match) {
    timestamp = parseSyslogTimestamp(rfc5424Match[2]);
    if (rfc5424Match[3] !== '-') hostname = rfc5424Match[3];
    if (rfc5424Match[4] !== '-') app_name = rfc5424Match[4];
    if (rfc5424Match[5] !== '-') proc_id = rfc5424Match[5];
    message = rfc5424Match[7]?.trim() || '';
  } else {
    // 3. Check for RFC 3164 (BSD Syslog)
    // Matches: "Oct 21 13:15:00 hostname app[pid]: message"
    const bsdMatch = payload.match(/^([A-Za-z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:]+):\s*([\s\S]*)$/);
    if (bsdMatch) {
      timestamp = parseSyslogTimestamp(bsdMatch[1]);
      hostname = bsdMatch[2];
      const tag = bsdMatch[3].trim();
      message = bsdMatch[4]?.trim() || '';

      const pidMatch = tag.match(/^([a-zA-Z0-9_\-\.]+)(?:\[(\d+)\])?$/);
      if (pidMatch) {
        app_name = pidMatch[1];
        proc_id = pidMatch[2] || null;
      } else {
        app_name = tag;
      }
    } else {
      // 4. Fallback BSD variant: "Oct 21 13:15:00 app[pid]: message" without hostname
      const bsdNoHost = payload.match(/^([A-Za-z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+([^:]+):\s*([\s\S]*)$/);
      if (bsdNoHost) {
        timestamp = parseSyslogTimestamp(bsdNoHost[1]);
        const tag = bsdNoHost[2].trim();
        message = bsdNoHost[3]?.trim() || '';

        const pidMatch = tag.match(/^([a-zA-Z0-9_\-\.]+)(?:\[(\d+)\])?$/);
        if (pidMatch) {
          app_name = pidMatch[1];
          proc_id = pidMatch[2] || null;
        } else {
          app_name = tag;
        }
      } else {
        // Check if payload starts with filterlog: or has filterlog CSV pattern
        const filterlogPrefixMatch = payload.match(/^filterlog(?:\[\d+\])?:?\s*([\s\S]*)$/i);
        if (filterlogPrefixMatch) {
          app_name = 'filterlog';
          message = filterlogPrefixMatch[1].trim();
        } else if (/^\d+,,,[0-9a-zA-Z]*,[a-zA-Z0-9_\-]+,match,(?:block|pass|reject)/i.test(payload)) {
          // Direct pfSense filterlog CSV line without BSD header
          app_name = 'filterlog';
          message = payload.trim();
        } else {
          // Tag + message without timestamp (e.g. "squid[1234]: message")
          const tagOnly = payload.match(/^([^:]+):\s*([\s\S]*)$/);
          if (tagOnly) {
            const tag = tagOnly[1].trim();
            message = tagOnly[2]?.trim() || '';

            const pidMatch = tag.match(/^([a-zA-Z0-9_\-\.]+)(?:\[(\d+)\])?$/);
            if (pidMatch) {
              app_name = pidMatch[1];
              proc_id = pidMatch[2] || null;
            } else {
              app_name = tag;
            }
          }
        }
      }
    }
  }

  // Clean app_name
  app_name = app_name.toLowerCase().replace(/[^a-z0-9_\-\.]/g, '');
  if (!app_name) app_name = 'system';

  // 5. Special pfSense filterlog handling & parsing
  let action: string | null = null;
  let iface: string | null = null;
  let direction: string | null = null;
  let protocol: string | null = null;
  let src_ip: string | null = null;
  let dst_ip: string | null = null;
  let src_port: number | null = null;
  let dst_port: number | null = null;
  let tcp_flags: string | null = null;

  if (app_name === 'filterlog' || message.includes(',match,') || /^\d+,,,/.test(message)) {
    app_name = 'filterlog';
    const parsedFilter = parseFilterlogCsv(message);
    if (parsedFilter) {
      action = parsedFilter.action;
      iface = parsedFilter.interface;
      direction = parsedFilter.direction;
      protocol = parsedFilter.protocol;
      src_ip = parsedFilter.srcIp;
      dst_ip = parsedFilter.dstIp;
      src_port = parsedFilter.srcPort ?? null;
      dst_port = parsedFilter.dstPort ?? null;
      tcp_flags = parsedFilter.tcpFlags ?? null;

      // Classify filterlog "block" and "reject" events as Warning (4) and security-relevant
      if (action === 'block' || action === 'reject') {
        severity = 4; // Warning
        severity_label = 'warning';
      }

      // Format clean, readable message for UI display
      const protoStr = protocol || 'IP';
      const srcStr = src_port ? `${src_ip}:${src_port}` : (src_ip || 'unknown');
      const dstStr = dst_port ? `${dst_ip}:${dst_port}` : (dst_ip || 'unknown');
      const flagStr = tcp_flags && tcp_flags !== '-' ? ` [${tcp_flags}]` : '';
      message = `${action.toUpperCase()} ${direction} on ${iface}: ${protoStr} ${srcStr} -> ${dstStr}${flagStr}`;
    }
  }

  return {
    timestamp,
    facility,
    facility_label,
    severity,
    severity_label,
    hostname,
    app_name,
    proc_id,
    message: message || payload,
    raw_message: raw,
    action,
    interface: iface,
    direction,
    protocol,
    src_ip,
    dst_ip,
    src_port,
    dst_port,
    tcp_flags,
  };
}
