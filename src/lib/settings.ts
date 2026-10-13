import { getDatabase } from './db';

export interface SystemSettings {
  timezone: string;
  lanCidrs: string[];
  firewallIp: string;
  squidPort: number;
  hideFirewallTraffic: boolean;
  hideProxyHop: boolean;
  retentionDaysSquid: number;
  retentionDaysFlows: number;
  anonymizeExports: boolean;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  timezone: 'Asia/Colombo', // UTC+5:30
  lanCidrs: ['192.168.0.0/24', '192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'],
  firewallIp: '192.168.0.1',
  squidPort: 3128,
  hideFirewallTraffic: true,
  hideProxyHop: true,
  retentionDaysSquid: 60,
  retentionDaysFlows: 7,
  anonymizeExports: false,
};

export { anonymizeUsername } from './privacy';

const SETTINGS_KEY = 'app_system_settings';

/**
 * Retrieve persistent system settings from SQLite system_meta
 */
export function getSystemSettings(): SystemSettings {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM system_meta WHERE key = ?').get(SETTINGS_KEY) as { value: string } | undefined;
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('[Settings] Failed to read system settings, falling back to defaults:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Update system settings in SQLite system_meta
 */
export function updateSystemSettings(partial: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  const updated: SystemSettings = { ...current, ...partial };
  try {
    const db = getDatabase();
    const now = Date.now();
    db.prepare(`
      INSERT INTO system_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(SETTINGS_KEY, JSON.stringify(updated), now);
  } catch (err) {
    console.error('[Settings] Failed to save system settings:', err);
  }
  return updated;
}

/**
 * Convert IPv4 string to 32-bit unsigned number
 */
function ipToLong(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8) + n;
  }
  return num >>> 0;
}

/**
 * Check if an IP matches a CIDR block (e.g. 192.168.0.0/24)
 */
function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = bitsStr ? parseInt(bitsStr, 10) : 32;
  const ipNum = ipToLong(ip);
  const rangeNum = ipToLong(range);
  if (ipNum === null || rangeNum === null || isNaN(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = ((0xffffffff << (32 - bits)) >>> 0);
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Check if an IPv4 address is an Internal LAN address based on configured CIDRs
 */
export function isInternalIp(ip: string, customCidrs?: string[]): boolean {
  if (!ip || ip === '-' || ip === 'unknown') return false;
  const cidrs = customCidrs && customCidrs.length > 0
    ? customCidrs
    : getSystemSettings().lanCidrs;

  for (const cidr of cidrs) {
    if (ipMatchesCidr(ip, cidr)) return true;
  }

  // Fallback RFC1918
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/**
 * Get date range millisecond boundaries interpreted in the given timezone (defaults to Asia/Colombo)
 */
export function getTimezoneDayBounds(dateStr: string, timezone = 'Asia/Colombo'): { startMs: number; endMs: number } {
  // Use Intl.DateTimeFormat to reliably determine UTC offset for the given date in the target timezone
  // For 'YYYY-MM-DD', create a reference date at 12:00:00 UTC
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
  if (!year || !month || !day) {
    const fallback = new Date(dateStr).getTime();
    return { startMs: fallback, endMs: fallback + 86399999 };
  }

  // Build target ISO string in target timezone
  // In Asia/Colombo (UTC+5:30), start of day 00:00 is previous day 18:30 UTC
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Approximate offset in minutes: test at noon UTC on that day
    const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
    const parts = formatter.formatToParts(new Date(noonUtc));
    const findPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    const tzHour = findPart('hour');
    const tzDay = findPart('day');
    const tzMinute = findPart('minute');

    // Hour difference from 12:00 UTC
    let hourDiff = tzHour - 12;
    if (tzDay > day) hourDiff += 24;
    else if (tzDay < day) hourDiff -= 24;
    const offsetMinutes = hourDiff * 60 + tzMinute;
    const offsetMs = offsetMinutes * 60 * 1000;

    // Start of day in local time is 00:00:00.000 local = 00:00:00 - offset in UTC
    const startMs = Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs;
    const endMs = startMs + (24 * 60 * 60 * 1000) - 1;
    return { startMs, endMs };
  } catch {
    // Fallback +5:30 (Sri Lanka standard time: 330 mins = 19,800,000 ms)
    const offsetMs = 330 * 60 * 1000;
    const startMs = Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs;
    const endMs = startMs + (24 * 60 * 60 * 1000) - 1;
    return { startMs, endMs };
  }
}

/**
 * Format a timestamp (ms or Date) in the user's timezone (defaults to Asia/Colombo)
 */
export function formatTimestamp(timestamp: number | Date | string, timezone = 'Asia/Colombo'): string {
  const date = typeof timestamp === 'number'
    ? new Date(timestamp)
    : typeof timestamp === 'string'
    ? new Date(timestamp)
    : timestamp;

  if (isNaN(date.getTime())) return '-';

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date).replace(',', '');
  } catch {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
}
