import { getDatabase } from './db';

export type DomainCategory =
  | 'Social'
  | 'Streaming'
  | 'Messaging'
  | 'Cloud/Productivity'
  | 'Ads/Tracking'
  | 'Telemetry'
  | 'Search'
  | 'Other';

export const DEFAULT_CATEGORY_RULES: Record<string, DomainCategory> = {
  // Ads & Tracking
  'doubleclick.net': 'Ads/Tracking',
  'googlesyndication.com': 'Ads/Tracking',
  'googleadservices.com': 'Ads/Tracking',
  'adnxs.com': 'Ads/Tracking',
  'criteo.com': 'Ads/Tracking',
  'scorecardresearch.com': 'Ads/Tracking',
  'advertising.com': 'Ads/Tracking',

  // Telemetry
  'incoming.telemetry.mozilla.org': 'Telemetry',
  'telemetry.mozilla.org': 'Telemetry',
  'rum.api.intuit.com': 'Telemetry',
  'vortex.data.microsoft.com': 'Telemetry',
  'watson.telemetry.microsoft.com': 'Telemetry',
  'browser.pipe.aria.microsoft.com': 'Telemetry',
  'events.data.microsoft.com': 'Telemetry',
  'stats.wp.com': 'Telemetry',
  'o.clarity.ms': 'Telemetry',

  // Streaming
  'youtube.com': 'Streaming',
  'googlevideo.com': 'Streaming',
  'netflix.com': 'Streaming',
  'spotify.com': 'Streaming',
  'twitch.tv': 'Streaming',
  'vimeo.com': 'Streaming',
  'hulu.com': 'Streaming',

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

  // Messaging
  'slack.com': 'Messaging',
  'discord.com': 'Messaging',
  'discordapp.com': 'Messaging',
  'whatsapp.com': 'Messaging',
  'telegram.org': 'Messaging',
  'zoom.us': 'Messaging',

  // Cloud & Productivity
  'github.com': 'Cloud/Productivity',
  'githubusercontent.com': 'Cloud/Productivity',
  'gitlab.com': 'Cloud/Productivity',
  'office.com': 'Cloud/Productivity',
  'office365.com': 'Cloud/Productivity',
  'microsoft.com': 'Cloud/Productivity',
  'live.com': 'Cloud/Productivity',
  'notion.so': 'Cloud/Productivity',
  'atlassian.net': 'Cloud/Productivity',
  'jira.com': 'Cloud/Productivity',
  'aws.amazon.com': 'Cloud/Productivity',

  // Search
  'bing.com': 'Search',
  'duckduckgo.com': 'Search',
  'yahoo.com': 'Search',
  'baidu.com': 'Search',
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

  if (clean.includes('telemetry') || clean.includes('crashreport') || clean.includes('analytics')) {
    return 'Telemetry';
  }
  if (clean.includes('ads') || clean.includes('doubleclick') || clean.includes('banner')) {
    return 'Ads/Tracking';
  }
  if (clean.includes('google.com')) {
    return 'Search';
  }

  return 'Other';
}

export function isTelemetryOrAds(domain: string): boolean {
  const cat = getDomainCategory(domain);
  return cat === 'Telemetry' || cat === 'Ads/Tracking';
}

export function setCustomDomainCategory(domain: string, category: DomainCategory): void {
  const db = getDatabase();
  const clean = domain.trim().toLowerCase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO domain_categories (domain, category, is_custom, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(domain) DO UPDATE SET category = excluded.category, updated_at = excluded.updated_at
  `).run(clean, category, now);

  if (!categoryCache) initCategoryCache();
  categoryCache?.set(clean, category);
}

export function getAllCategoriesMap(): Record<string, DomainCategory> {
  if (!categoryCache) initCategoryCache();
  const result: Record<string, DomainCategory> = {};
  categoryCache?.forEach((v, k) => {
    result[k] = v;
  });
  return result;
}
