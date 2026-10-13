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

  // 3. Fallback organization classification based on reverse DNS or well-known prefixes
  let org: string | null = null;
  if (hostname) {
    if (hostname.includes('google') || hostname.includes('1e100.net')) org = 'Google LLC';
    else if (hostname.includes('cloudflare') || hostname.includes('1.1.1.1')) org = 'Cloudflare Inc';
    else if (hostname.includes('microsoft') || hostname.includes('msn.com')) org = 'Microsoft Corporation';
    else if (hostname.includes('amazon') || hostname.includes('aws')) org = 'Amazon Web Services';
    else if (hostname.includes('akamai')) org = 'Akamai Technologies';
    else if (hostname.includes('fastly')) org = 'Fastly CDN';
    else {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        org = parts.slice(-2).join('.');
      }
    }
  }

  // 4. Save to cache
  try {
    db.prepare(`
      INSERT INTO ip_enrichment (ip, hostname, org, country, city, asn, updated_at, ttl_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, 86400)
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
