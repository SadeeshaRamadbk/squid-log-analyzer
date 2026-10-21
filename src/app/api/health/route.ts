import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'healthy' | 'degraded' | 'down' = 'down';
  let dbLatencyMs = 0;
  let journalMode = 'unknown';
  let dbSizeBytes = 0;
  let dbSizeFormatted = '0 MB';
  let counts: Record<string, number> = {};
  let collectors: Record<string, { lastActivityMs: number | null; status: 'active' | 'idle' | 'unknown' }> = {};

  try {
    const db = getDatabase();
    const qStart = Date.now();
    const testRow = db.prepare('SELECT 1 as alive').get() as any;
    dbLatencyMs = Date.now() - qStart;

    if (testRow?.alive === 1) {
      dbStatus = 'healthy';
    }

    const jModeRow = db.prepare('PRAGMA journal_mode').get() as any;
    journalMode = jModeRow?.journal_mode || 'unknown';

    // Record counts
    const squidCount = db.prepare('SELECT count(*) as cnt FROM raw_logs').get() as any;
    const netflowCount = db.prepare('SELECT count(*) as cnt FROM netflow_logs').get() as any;
    const syslogCount = db.prepare('SELECT count(*) as cnt FROM syslog_events').get() as any;
    const alertCount = db.prepare("SELECT count(*) as cnt FROM security_alerts WHERE status = 'active'").get() as any;
    const userCount = db.prepare('SELECT count(*) as cnt FROM users').get() as any;
    const auditCount = db.prepare('SELECT count(*) as cnt FROM system_audit_logs').get() as any;

    counts = {
      squidLogs: Number(squidCount?.cnt || 0),
      netflowLogs: Number(netflowCount?.cnt || 0),
      syslogEvents: Number(syslogCount?.cnt || 0),
      activeAlerts: Number(alertCount?.cnt || 0),
      systemUsers: Number(userCount?.cnt || 0),
      auditEntries: Number(auditCount?.cnt || 0),
    };

    // Collector recency
    const lastSquid = db.prepare('SELECT MAX(timestamp) as ts FROM raw_logs').get() as any;
    const lastFlow = db.prepare('SELECT MAX(timestamp) as ts FROM netflow_logs').get() as any;
    const lastSyslog = db.prepare('SELECT MAX(timestamp) as ts FROM syslog_events').get() as any;

    const now = Date.now();
    collectors = {
      squidProxy: {
        lastActivityMs: lastSquid?.ts || null,
        status: lastSquid?.ts && now - lastSquid.ts < 3600000 ? 'active' : 'idle',
      },
      netflow: {
        lastActivityMs: lastFlow?.ts || null,
        status: lastFlow?.ts && now - lastFlow.ts < 3600000 ? 'active' : 'idle',
      },
      syslog: {
        lastActivityMs: lastSyslog?.ts || null,
        status: lastSyslog?.ts && now - lastSyslog.ts < 3600000 ? 'active' : 'idle',
      },
    };

    // DB file size
    const dbPath = path.resolve(process.cwd(), 'data', 'squid_analyzer.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      dbSizeBytes = stats.size;
      dbSizeFormatted = `${(dbSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  } catch (err: any) {
    dbStatus = 'down';
    logger.error('Health check failed database verification', { error: err });
  }

  const mem = process.memoryUsage();
  const memory = {
    rssMb: Math.round(mem.rss / 1024 / 1024),
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
  };

  const uptimeSec = Math.round(process.uptime());
  const responseTimeMs = Date.now() - startTime;
  const isHealthy = dbStatus === 'healthy';

  const healthData = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`,
    uptimeSeconds: uptimeSec,
    responseTimeMs,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      journalMode,
      size: dbSizeFormatted,
      sizeBytes: dbSizeBytes,
      records: counts,
    },
    collectors,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memory,
    },
  };

  logger.info('/api/health check executed', {
    status: healthData.status,
    latencyMs: dbLatencyMs,
    dbSize: dbSizeFormatted,
  });

  return NextResponse.json(healthData, {
    status: isHealthy ? 200 : 503,
  });
}
