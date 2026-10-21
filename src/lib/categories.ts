import { getDatabase } from './db';

export type DomainCategory =
  | 'Work'
  | 'Streaming'
  | 'Social'
  | 'Ads/Telemetry/CDN'
  | 'Other';

export function normalizeCategory(cat: string): DomainCategory {
  if (cat === 'Work' || cat === 'Cloud/Productivity' || cat === 'Messaging' || cat === 'Search') return 'Work';
  if (cat === 'Streaming') return 'Streaming';
  if (cat === 'Social') return 'Social';
  if (cat === 'Ads/Telemetry/CDN' || cat === 'Ads/Tracking' || cat === 'Telemetry') return 'Ads/Telemetry/CDN';
  return 'Other';
}

export const DEFAULT_CATEGORY_RULES: Record<string, DomainCategory> = {
  // Ads / Telemetry / CDN
  'doubleclick.net': 'Ads/Telemetry/CDN',
  'googlesyndication.com': 'Ads/Telemetry/CDN',
  'googleadservices.com': 'Ads/Telemetry/CDN',
  'adnxs.com': 'Ads/Telemetry/CDN',
  'criteo.com': 'Ads/Telemetry/CDN',
  'scorecardresearch.com': 'Ads/Telemetry/CDN',
  'advertising.com': 'Ads/Telemetry/CDN',
  'incoming.telemetry.mozilla.org': 'Ads/Telemetry/CDN',
  'telemetry.mozilla.org': 'Ads/Telemetry/CDN',
  'rum.api.intuit.com': 'Ads/Telemetry/CDN',
  'vortex.data.microsoft.com': 'Ads/Telemetry/CDN',
  'watson.telemetry.microsoft.com': 'Ads/Telemetry/CDN',
  'browser.pipe.aria.microsoft.com': 'Ads/Telemetry/CDN',
  'events.data.microsoft.com': 'Ads/Telemetry/CDN',
  'stats.wp.com': 'Ads/Telemetry/CDN',
  'o.clarity.ms': 'Ads/Telemetry/CDN',
  'cloudflare.com': 'Ads/Telemetry/CDN',
  'fastly.net': 'Ads/Telemetry/CDN',
  'akamaized.net': 'Ads/Telemetry/CDN',

  // Streaming
  'youtube.com': 'Streaming',
  'googlevideo.com': 'Streaming',
  'netflix.com': 'Streaming',
  'spotify.com': 'Streaming',
  'twitch.tv': 'Streaming',
  'vimeo.com': 'Streaming',
  'hulu.com': 'Streaming',
  'disneyplus.com': 'Streaming',

  // Social
  'facebook.com': 'Social',
  'fbcdn.net': 'Social',
  'instagram.com': 'Social',
  'twitter.com': 'Social',
  'x.com': 'Social',
  't.co': 'Social',
  'linkedin.com': 'Social',
  'reddit.com': 'Social',
  'tiktok.com': 'Social',
  'pinterest.com': 'Social',

  // Work & Productivity
  'slack.com': 'Work',
  'discord.com': 'Work',
  'discordapp.com': 'Work',
  'whatsapp.com': 'Work',
  'telegram.org': 'Work',
  'zoom.us': 'Work',
  'github.com': 'Work',
  'githubusercontent.com': 'Work',
  'gitlab.com': 'Work',
  'office.com': 'Work',
  'office365.com': 'Work',
  'microsoft.com': 'Work',
  'live.com': 'Work',
  'notion.so': 'Work',
  'atlassian.net': 'Work',
  'jira.com': 'Work',
  'aws.amazon.com': 'Work',
  'google.com': 'Work',
  'gmail.com': 'Work',
  'docs.google.com': 'Work',
  'drive.google.com': 'Work',
  'bing.com': 'Work',
  'duckduckgo.com': 'Work',
};

// In-memory cache for fast lookup
let categoryCache: Map<string, DomainCategory> | null = null;

export function initCategoryCache(): Map<string, DomainCategory> {
  const map = new Map<string, DomainCategory>();
  for (const [dom, cat] of Object.entries(DEFAULT_CATEGORY_RULES)) {
    map.set(dom.toLowerCase(), cat);
  }

  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT domain, category FROM domain_categories').all() as any[];
    for (const r of rows) {
      map.set(r.domain.toLowerCase(), r.category as DomainCategory);
    }
  } catch (err) {
    console.warn('Failed to load custom domain categories from db:', err);
  }

  categoryCache = map;
  return map;
}

export function getDomainCategory(domain: string): DomainCategory {
  if (!domain) return 'Other';
  const clean = domain.trim().toLowerCase();

  if (!categoryCache) {
    initCategoryCache();
  }

  // Exact match
  if (categoryCache?.has(clean)) {
    return categoryCache.get(clean)!;
  }

  // Subdomain suffix match (e.g., s.youtube.com -> youtube.com)
  for (const [dom, cat] of categoryCache!.entries()) {
    if (clean === dom || clean.endsWith('.' + dom)) {
      return cat;
    }
  }

  if (clean.includes('telemetry') || clean.includes('crashreport') || clean.includes('analytics') || clean.includes('ads') || clean.includes('doubleclick') || clean.includes('cdn')) {
    return 'Ads/Telemetry/CDN';
  }
  if (clean.includes('google.com') || clean.includes('office') || clean.includes('work')) {
    return 'Work';
  }

  return 'Other';
}

export function isTelemetryOrAds(domain: string): boolean {
  const cat = getDomainCategory(domain);
  return cat === 'Ads/Telemetry/CDN';
}

export function setCustomDomainCategory(domain: string, category: DomainCategory): void {
  const db = getDatabase();
  const clean = domain.trim().toLowerCase();
  const now = Date.now();
  const canonCat = normalizeCategory(category);

  db.prepare(`
    INSERT INTO domain_categories (domain, category, is_custom, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(domain) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at
  `).run(clean, canonCat, now);

  if (!categoryCache) initCategoryCache();
  categoryCache?.set(clean, canonCat);
}

export function deleteCustomDomainCategory(domain: string): void {
  const db = getDatabase();
  const clean = domain.trim().toLowerCase();
  db.prepare('DELETE FROM domain_categories WHERE domain = ?').run(clean);

  if (DEFAULT_CATEGORY_RULES[clean]) {
    categoryCache?.set(clean, DEFAULT_CATEGORY_RULES[clean]);
  } else {
    categoryCache?.delete(clean);
  }
}

export function getAllCategoriesMap(): Record<string, DomainCategory> {
  if (!categoryCache) initCategoryCache();
  const result: Record<string, DomainCategory> = {};
  categoryCache?.forEach((v, k) => {
    result[k] = v;
  });
  return result;
}

export interface DepartmentCategoryBreakdown {
  department: string;
  totalRequests: number;
  totalBytes: number;
  workRequests: number;
  streamingRequests: number;
  socialRequests: number;
  adsRequests: number;
  otherRequests: number;
  workPercentage: number;
  streamingPercentage: number;
  socialPercentage: number;
  adsPercentage: number;
  otherPercentage: number;
}

/**
 * Compile domain category usage summaries aggregated per department
 */
export function getDepartmentCategorySummary(): DepartmentCategoryBreakdown[] {
  const db = getDatabase();

  // Try daily_summaries first for multi-day speed
  let rows = db.prepare(`
    SELECT
      d.client_ip,
      d.domain,
      SUM(d.request_count) AS request_count,
      SUM(d.bytes) AS bytes,
      COALESCE(m.department, 'Unassigned') AS department
    FROM daily_summaries d
    LEFT JOIN ip_mappings m ON d.client_ip = m.client_ip
    GROUP BY d.client_ip, d.domain
  `).all() as any[];

  if (rows.length === 0) {
    rows = db.prepare(`
      SELECT
        r.client_ip,
        r.domain,
        COUNT(*) AS request_count,
        COALESCE(SUM(r.bytes), 0) AS bytes,
        COALESCE(m.department, 'Unassigned') AS department
      FROM raw_logs r
      LEFT JOIN ip_mappings m ON r.client_ip = m.client_ip
      GROUP BY r.client_ip, r.domain
      LIMIT 10000
    `).all() as any[];
  }

  const deptMap: Record<string, {
    totalRequests: number;
    totalBytes: number;
    work: number;
    streaming: number;
    social: number;
    ads: number;
    other: number;
  }> = {};

  for (const r of rows) {
    const dept = r.department || 'Unassigned';
    if (!deptMap[dept]) {
      deptMap[dept] = { totalRequests: 0, totalBytes: 0, work: 0, streaming: 0, social: 0, ads: 0, other: 0 };
    }
    const reqs = Number(r.request_count || 0);
    const bytes = Number(r.bytes || 0);
    const cat = getDomainCategory(r.domain);

    deptMap[dept].totalRequests += reqs;
    deptMap[dept].totalBytes += bytes;

    if (cat === 'Work') deptMap[dept].work += reqs;
    else if (cat === 'Streaming') deptMap[dept].streaming += reqs;
    else if (cat === 'Social') deptMap[dept].social += reqs;
    else if (cat === 'Ads/Telemetry/CDN') deptMap[dept].ads += reqs;
    else deptMap[dept].other += reqs;
  }

  return Object.entries(deptMap).map(([department, data]) => {
    const total = data.totalRequests || 1;
    return {
      department,
      totalRequests: data.totalRequests,
      totalBytes: data.totalBytes,
      workRequests: data.work,
      streamingRequests: data.streaming,
      socialRequests: data.social,
      adsRequests: data.ads,
      otherRequests: data.other,
      workPercentage: Number(((data.work / total) * 100).toFixed(1)),
      streamingPercentage: Number(((data.streaming / total) * 100).toFixed(1)),
      socialPercentage: Number(((data.social / total) * 100).toFixed(1)),
      adsPercentage: Number(((data.ads / total) * 100).toFixed(1)),
      otherPercentage: Number(((data.other / total) * 100).toFixed(1)),
    };
  }).sort((a, b) => b.totalRequests - a.totalRequests);
}
