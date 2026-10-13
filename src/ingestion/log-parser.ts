export interface ParsedSquidLog {
  timestamp: number;        // Epoch in milliseconds
  date: string;             // 'YYYY-MM-DD'
  clientIp: string;
  method: string;
  url: string | null;       // Full URL ONLY if blocked, otherwise null
  rawUrl: string;           // Original raw URL (used for domain extraction)
  domain: string;
  resultCode: string;       // e.g. 'TCP_DENIED/403', 'TCP_MISS/200'
  statusCode: number;       // e.g. 403, 200
  isBlocked: boolean;
  bytes: number;
}

/**
 * Clean and extract domain / hostname from a Squid URL or CONNECT target
 */
export function extractDomain(rawUrl: string): string {
  if (!rawUrl || rawUrl === '-') return 'unknown';

  let cleaned = rawUrl.trim();

  // Handle CONNECT target: e.g. "www.google.com:443" or "login.nipponbpo.local:8443"
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://') && !cleaned.startsWith('ftp://')) {
    // If it has a colon for port, strip the port
    const colonIndex = cleaned.indexOf(':');
    if (colonIndex !== -1) {
      cleaned = cleaned.substring(0, colonIndex);
    }
    // Strip any path if present
    const slashIndex = cleaned.indexOf('/');
    if (slashIndex !== -1) {
      cleaned = cleaned.substring(0, slashIndex);
    }
    return cleaned.toLowerCase() || 'unknown';
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname.toLowerCase();
    // Remove IPv6 brackets if any
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }
    return hostname || 'unknown';
  } catch {
    // Fallback regex if URL parsing fails
    const match = cleaned.match(/^[a-zA-Z]+:\/\/([^/:]+)/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    return 'unknown';
  }
}

/**
 * Determine if Squid log result signifies a blocked request
 */
export function isRequestBlocked(resultCode: string): boolean {
  if (!resultCode) return false;
  const upper = resultCode.toUpperCase();

  // Squid codes indicating access denied or forbidden
  // Common: TCP_DENIED/403, TCP_DENIED/407, NONE/403, TCP_BLOCKED/403
  if (upper.includes('DENIED') || upper.includes('BLOCKED')) {
    return true;
  }

  // Check HTTP status portion (e.g. /403)
  const parts = upper.split('/');
  if (parts.length > 1) {
    const status = parseInt(parts[1], 10);
    if (status === 403) {
      return true;
    }
  }

  return false;
}

/**
 * Parse a standard Squid access.log line:
 * 1710321234.567    120 192.168.1.50 TCP_DENIED/403 3840 GET http://malicious.example.com/bad/path - NONE/- text/html
 * or:
 * 1710321235.123     45 192.168.1.52 TCP_TUNNEL/200 12040 CONNECT www.google.com:443 - HIER_DIRECT/142.250.190.4 -
 */
export function parseSquidLogLine(line: string): ParsedSquidLog | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  // Split on whitespace
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 7) {
    return null;
  }

  // Token 0: timestamp (e.g. 1710321234.567)
  const rawTime = parseFloat(tokens[0]);
  if (isNaN(rawTime)) {
    return null;
  }
  const timestamp = Math.floor(rawTime * 1000); // convert to ms
  const dateObj = new Date(timestamp);
  const date = dateObj.toISOString().split('T')[0]; // 'YYYY-MM-DD'

  // Token 2: client IP
  const clientIp = tokens[2] || 'unknown';

  // Token 3: result_code / status (e.g. TCP_DENIED/403)
  const resultCode = tokens[3] || 'UNKNOWN/0';

  // Token 4: bytes
  const bytes = parseInt(tokens[4], 10) || 0;

  // Token 5: method (e.g. GET, POST, CONNECT)
  const method = (tokens[5] || 'GET').toUpperCase();

  // Token 6: URL
  const rawUrl = tokens[6] || '-';

  // Extract domain
  const domain = extractDomain(rawUrl);

  // Check if blocked
  const blocked = isRequestBlocked(resultCode);

  // Extract numeric HTTP status code
  const codeParts = resultCode.split('/');
  const statusCode = codeParts.length > 1 ? parseInt(codeParts[1], 10) || 0 : 0;

  // Requirement: Store full URL ONLY for blocked requests
  const url = blocked ? rawUrl : null;

  return {
    timestamp,
    date,
    clientIp,
    method,
    url,
    rawUrl,
    domain,
    resultCode,
    statusCode,
    isBlocked: blocked,
    bytes,
  };
}
