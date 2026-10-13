import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { BatchInserter } from './batch-inserter';
import { parseSquidLogLine } from './log-parser';

/**
 * Realistic synthetic log generator for nipponbpo.local network
 */
const INTERNAL_IPS = [
  '10.20.1.15',
  '10.20.1.42',
  '10.20.1.88',
  '10.20.2.10',
  '10.20.2.25',
  '10.20.2.104',
  '10.20.3.5',
  '10.20.3.18',
  '192.168.10.50',
  '192.168.10.75',
];

const ALLOWED_DOMAINS = [
  { domain: 'nipponbpo.local', url: 'https://portal.nipponbpo.local/dashboard', method: 'GET', weight: 25 },
  { domain: 'google.com', url: 'https://www.google.com/search?q=reports', method: 'GET', weight: 20 },
  { domain: 'github.com', url: 'https://github.com/nippon-bpo/core-api', method: 'GET', weight: 15 },
  { domain: 'slack.com', url: 'https://app.slack.com/client', method: 'POST', weight: 12 },
  { domain: 'microsoft.com', url: 'https://login.microsoftonline.com/common/oauth2', method: 'POST', weight: 10 },
  { domain: 'aws.amazon.com', url: 'https://console.aws.amazon.com/s3/home', method: 'GET', weight: 8 },
  { domain: 'jira.atlassian.net', url: 'https://nipponbpo.atlassian.net/browse/PROJ-102', method: 'GET', weight: 7 },
  { domain: 'zoom.us', url: 'https://zoom.us/join', method: 'GET', weight: 5 },
];

const BLOCKED_DOMAINS = [
  { domain: 'facebook.com', url: 'https://www.facebook.com/login.php?ref=feed', method: 'GET', code: 'TCP_DENIED/403' },
  { domain: 'tiktok.com', url: 'https://www.tiktok.com/@trending/feed', method: 'GET', code: 'TCP_DENIED/403' },
  { domain: 'gambling-online-win.biz', url: 'http://gambling-online-win.biz/play/poker?ref=promo', method: 'GET', code: 'TCP_DENIED/403' },
  { domain: 'phishing-login-update.net', url: 'http://phishing-login-update.net/auth/verify?session=92837', method: 'POST', code: 'TCP_DENIED/403' },
  { domain: 'torrents-unlimited.org', url: 'http://torrents-unlimited.org/download/movie.iso', method: 'GET', code: 'TCP_DENIED/403' },
  { domain: 'crypto-mining-pool.cc', url: 'http://crypto-mining-pool.cc/ws/mine', method: 'CONNECT', code: 'TCP_DENIED/403' },
];

export function generateSyntheticLogs(daysCount = 14, logsPerDay = 300) {
  console.log(`[Demo Generator] Generating synthetic logs for ${daysCount} days (~${logsPerDay} requests/day)...`);

  const inserter = new BatchInserter(500, 1000);
  const now = Date.now();
  let totalGenerated = 0;

  for (let dayOffset = daysCount; dayOffset >= 0; dayOffset--) {
    const dayTimestamp = now - dayOffset * 24 * 60 * 60 * 1000;

    for (let i = 0; i < logsPerDay; i++) {
      // Random time during that day
      const recordTime = dayTimestamp + Math.floor(Math.random() * 86400000);
      const timeSeconds = (recordTime / 1000).toFixed(3);
      const clientIp = INTERNAL_IPS[Math.floor(Math.random() * INTERNAL_IPS.length)];
      const elapsed = Math.floor(Math.random() * 350) + 10;
      const bytes = Math.floor(Math.random() * 120000) + 400;

      const isBlocked = Math.random() < 0.12; // 12% blocked traffic

      let line: string;
      if (isBlocked) {
        const item = BLOCKED_DOMAINS[Math.floor(Math.random() * BLOCKED_DOMAINS.length)];
        line = `${timeSeconds} ${elapsed} ${clientIp} ${item.code} ${bytes} ${item.method} ${item.url} - NONE/- text/html`;
      } else {
        const item = ALLOWED_DOMAINS[Math.floor(Math.random() * ALLOWED_DOMAINS.length)];
        const code = Math.random() < 0.25 ? 'TCP_HIT/200' : 'TCP_MISS/200';
        line = `${timeSeconds} ${elapsed} ${clientIp} ${code} ${bytes} ${item.method} ${item.url} - DIRECT/${item.domain} text/html`;
      }

      const parsed = parseSquidLogLine(line);
      if (parsed) {
        inserter.push(parsed);
        totalGenerated++;
      }
    }
  }

  // Also generate some logs > 65 days old to test retention cleanup!
  console.log('[Demo Generator] Generating logs older than 65 days to verify retention pruning...');
  for (let i = 0; i < 50; i++) {
    const oldTimestamp = now - (65 + Math.floor(Math.random() * 10)) * 24 * 60 * 60 * 1000;
    const timeSeconds = (oldTimestamp / 1000).toFixed(3);
    const clientIp = INTERNAL_IPS[0];
    const line = `${timeSeconds} 45 ${clientIp} TCP_MISS/200 1200 GET http://archive.nipponbpo.local/old - DIRECT/archive.nipponbpo.local text/html`;
    const parsed = parseSquidLogLine(line);
    if (parsed) {
      inserter.push(parsed);
      totalGenerated++;
    }
  }

  inserter.flush();
  inserter.close();
  console.log(`[Demo Generator] Done! Ingested ${totalGenerated} sample records into SQLite.`);
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('demo-generator.ts'))) {
  generateSyntheticLogs(14, 250);
}
