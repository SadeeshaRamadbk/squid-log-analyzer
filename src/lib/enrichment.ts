import dns from 'dns';
import { getDatabase } from './db';

export interface IpEnrichmentData {
  ip: string;
  hostname: string | null;
  org: string | null;
  country: string | null;
  city: string | null;
  asn: string | null;
  cached: boolean;
}

/**
 * Well-known IP prefixes and major cloud/CDN providers
 */
function classifyOrgByIp(ip: string): string | null {
  if (ip === '8.8.8.8' || ip === '8.8.4.4') return 'Google Public DNS';
  if (ip === '1.1.1.1' || ip === '1.0.0.1') return 'Cloudflare 1.1.1.1';
  if (ip.startsWith('94.140.14.') || ip.startsWith('94.140.15.')) return 'AdGuard DNS';
  if (ip.startsWith('142.250.') || ip.startsWith('172.217.') || ip.startsWith('216.58.') || ip.startsWith('173.194.') || ip.startsWith('142.251.')) return 'Google LLC';
  if (ip.startsWith('157.240.') || ip.startsWith('31.13.') || ip.startsWith('69.171.')) return 'Meta Platforms';
  if (ip.startsWith('20.') || ip.startsWith('40.') || ip.startsWith('52.') || ip.startsWith('13.107.')) return 'Microsoft Corporation';
  if (ip.startsWith('13.') || ip.startsWith('54.') || ip.startsWith('34.') || ip.startsWith('3.')) return 'Amazon Web Services';
  if (ip.startsWith('104.16.') || ip.startsWith('104.17.') || ip.startsWith('104.18.') || ip.startsWith('104.21.') || ip.startsWith('172.67.')) return 'Cloudflare CDN';
  if (ip.startsWith('17.') || ip.startsWith('17.253.')) return 'Apple Inc';
  if (ip.startsWith('140.82.') || ip.startsWith('192.30.255.')) return 'GitHub';
  if (ip.startsWith('151.101.')) return 'Fastly CDN';
  if (ip.startsWith('23.') || ip.startsWith('104.')) return 'Akamai / Cloudflare';
  return null;
}

function classifyOrgByHostname(hostname: string): string | null {
  const h = hostname.toLowerCase();
  if (h.includes('1e100.net') || h.includes('google') || h.includes('youtube')) return 'Google LLC';
  if (h.includes('cloudflare') || h.includes('cloudflare-dns')) return 'Cloudflare Inc';
  if (h.includes('microsoft') || h.includes('msn.com') || h.includes('azure') || h.includes('live.com') || h.includes('office')) return 'Microsoft Corporation';
  if (h.includes('facebook') || h.includes('fbcdn') || h.includes('meta')) return 'Meta Platforms';
  if (h.includes('amazonaws') || h.includes('aws') || h.includes('amazon')) return 'Amazon Web Services';
  if (h.includes('apple') || h.includes('icloud') || h.includes('aaplimg')) return 'Apple Inc';
  if (h.includes('adguard')) return 'AdGuard Software';
  if (h.includes('akamai') || h.includes('akamaitechnologies')) return 'Akamai Technologies';
  if (h.includes('fastly')) return 'Fastly CDN';
  if (h.includes('github')) return 'GitHub';
  if (h.includes('twitter') || h.includes('t.co') || h.includes('x.com')) return 'X / Twitter';
  if (h.includes('whatsapp')) return 'WhatsApp / Meta';
  const parts = h.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return null;
}

/**
 * Asynchronously lookup reverse DNS and GeoIP/ASN info with SQLite TTL cache
 */
export async function getEnrichedIp(ip: string): Promise<IpEnrichmentData> {
  const cleanIp = ip.trim();
  const db = getDatabase();
  const now = Date.now();

  // 1. Check SQLite Cache
  try {
    const cached = db.prepare(`
      SELECT ip, hostname, org, country, city, asn, updated_at, ttl_seconds
      FROM ip_enrichment
      WHERE ip = ?
    `).get(cleanIp) as any;

    if (cached) {
      const ageSeconds = (now - cached.updated_at) / 1000;
      if (ageSeconds < cached.ttl_seconds) {
        return {
          ip: cleanIp,
          hostname: cached.hostname,
          org: cached.org,
          country: cached.country,
          city: cached.city,
          asn: cached.asn,
          cached: true,
        };
      }
    }
  } catch (err) {
    console.warn('Cache lookup error:', err);
  }

  // 2. Perform async reverse DNS lookup
  let hostname: string | null = null;
  try {
    const hostnames = await Promise.race([
      dns.promises.reverse(cleanIp),
      new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
    ]);
    if (hostnames && hostnames.length > 0) {
      hostname = hostnames[0];
    }
  } catch {
    // Reverse DNS timeout or unresolvable - ignore
  }

  // 3. Organization classification based on reverse DNS or well-known prefixes
  let org: string | null = null;
  if (hostname) {
    org = classifyOrgByHostname(hostname);
  }
  if (!org) {
    org = classifyOrgByIp(cleanIp);
  }

  // 4. Save to cache (7 days TTL)
  try {
    db.prepare(`
      INSERT INTO ip_enrichment (ip, hostname, org, country, city, asn, updated_at, ttl_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, 604800)
      ON CONFLICT(ip) DO UPDATE SET
        hostname = excluded.hostname,
        org = excluded.org,
        country = excluded.country,
        city = excluded.city,
        asn = excluded.asn,
        updated_at = excluded.updated_at
    `).run(cleanIp, hostname, org, null, null, null, now);
  } catch (err) {
    console.warn('Cache save error:', err);
  }

  return {
    ip: cleanIp,
    hostname,
    org,
    country: null,
    city: null,
    asn: null,
    cached: false,
  };
}

/**
 * Fire-and-forget background enrichment for a list of remote IPs
 */
export function triggerEnrichmentForIps(ips: string[]): void {
  const candidates = [...new Set(ips)].filter((ip) => {
    if (!ip || ip.includes(':')) return false;
    if (
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('127.') ||
      ip === '0.0.0.0'
    ) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return;

  // Process asynchronously without blocking caller
  setTimeout(async () => {
    for (const ip of candidates) {
      try {
        await getEnrichedIp(ip);
      } catch {
        // Ignore background failures
      }
    }
  }, 10);
}
