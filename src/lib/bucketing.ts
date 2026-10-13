import { getTimezoneDayBounds } from './settings';

export interface TimeBucketConfig {
  bucketSizeMs: number;
  totalBuckets: number;
  startMs: number;
  endMs: number;
  labelFormat: 'minute' | 'hour' | 'day';
}

export interface SquidTimePoint {
  timestamp: number;
  date: string;
  requestCount: number;
  blockedCount: number;
  bytes: number;
  downloadBytes: number;
  uploadBytes: number;
}

export interface NetflowTimePoint {
  timestamp: number;
  date: string;
  flowCount: number;
  bytes: number;
  downloadBytes: number;
  uploadBytes: number;
  packets: number;
}

/**
 * Format a timestamp into user-friendly chart label based on bucket format and timezone
 */
export function formatBucketLabel(timestampMs: number, format: 'minute' | 'hour' | 'day', timezone = 'Asia/Colombo'): string {
  const date = new Date(timestampMs);
  try {
    if (format === 'minute') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    }
    if (format === 'hour') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().substring(11, 16);
  }
}

/**
 * Determine adaptive bucketing configuration based on time window and date range
 */
export function getTimeBucketConfig(
  filters: { timeWindow?: '30m' | '1h'; startDate?: string; endDate?: string },
  defaultMinMs?: number,
  defaultMaxMs?: number,
  timezone = 'Asia/Colombo'
): TimeBucketConfig {
  const now = Date.now();

  // 1. Granular 30m preset -> 1 minute buckets (30 points)
  if (filters.timeWindow === '30m') {
    const startMs = now - 30 * 60 * 1000;
    const bucketSizeMs = 60 * 1000;
    return {
      startMs,
      endMs: now,
      bucketSizeMs,
      totalBuckets: 30,
      labelFormat: 'minute',
    };
  }

  // 2. Granular 1h preset -> 5 minute buckets (12 points)
  if (filters.timeWindow === '1h') {
    const startMs = now - 60 * 60 * 1000;
    const bucketSizeMs = 5 * 60 * 1000;
    return {
      startMs,
      endMs: now,
      bucketSizeMs,
      totalBuckets: 12,
      labelFormat: 'minute',
    };
  }

  // 3. Date range filters
  let startMs: number;
  let endMs: number;

  if (filters.startDate || filters.endDate) {
    const sStr = filters.startDate || filters.endDate || new Date().toISOString().split('T')[0];
    const eStr = filters.endDate || filters.startDate || sStr;
    const sBounds = getTimezoneDayBounds(sStr, timezone);
    const eBounds = getTimezoneDayBounds(eStr, timezone);
    startMs = sBounds.startMs;
    endMs = eBounds.endMs;
  } else {
    // No explicit filter: use database bounds or fallback to last 24h
    startMs = defaultMinMs && defaultMinMs > 0 ? defaultMinMs : now - 24 * 60 * 60 * 1000;
    endMs = defaultMaxMs && defaultMaxMs > 0 ? Math.max(now, defaultMaxMs) : now;
  }

  const durationMs = Math.max(60000, endMs - startMs);
  const durationHours = durationMs / (3600 * 1000);

  // Single day or <= 24 hours -> 15-minute buckets (up to 96 points)
  if (durationHours <= 24) {
    const bucketSizeMs = 15 * 60 * 1000;
    const totalBuckets = Math.min(120, Math.max(1, Math.ceil(durationMs / bucketSizeMs)));
    return {
      startMs,
      endMs,
      bucketSizeMs,
      totalBuckets,
      labelFormat: 'minute',
    };
  }

  // Up to 7 days -> Hourly buckets (up to 168 points)
  if (durationHours <= 7 * 24) {
    const bucketSizeMs = 60 * 60 * 1000;
    const totalBuckets = Math.min(200, Math.max(1, Math.ceil(durationMs / bucketSizeMs)));
    return {
      startMs,
      endMs,
      bucketSizeMs,
      totalBuckets,
      labelFormat: 'hour',
    };
  }

  // More than 7 days -> Daily buckets (24h)
  const bucketSizeMs = 24 * 60 * 60 * 1000;
  const totalBuckets = Math.min(365, Math.max(1, Math.ceil(durationMs / bucketSizeMs)));
  return {
    startMs,
    endMs,
    bucketSizeMs,
    totalBuckets,
    labelFormat: 'day',
  };
}
