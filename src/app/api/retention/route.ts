import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getDatabasePath } from '@/lib/db';
import { getSystemSettings } from '@/lib/settings';
import { formatBytes } from '@/lib/formatters';
import { runRetentionJob } from '@/lib/db/retention';
import { getUserFromRequest } from '@/lib/auth';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const settings = getSystemSettings();
    const meta = db.prepare("SELECT value, updated_at FROM system_meta WHERE key = 'last_retention_run'").get() as any;

    const squidRaw = db.prepare('SELECT count(*) as count FROM raw_logs').get() as any;
    const squidSummary = db.prepare('SELECT count(*) as count FROM daily_summaries').get() as any;
    const flowRaw = db.prepare('SELECT count(*) as count FROM netflow_logs').get() as any;
    const flowMin = db.prepare('SELECT count(*) as count FROM netflow_minute_rollups').get() as any;
    const flowHr = db.prepare('SELECT count(*) as count FROM netflow_hourly_rollups').get() as any;
    const flowSummary = db.prepare('SELECT count(*) as count FROM netflow_daily_summaries').get() as any;

    let dbSizeBytes = 0;
    try {
      const dbPath = getDatabasePath();
      if (fs.existsSync(dbPath)) {
        dbSizeBytes += fs.statSync(dbPath).size;
      }
      const walPath = `${dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        dbSizeBytes += fs.statSync(walPath).size;
      }
    } catch {}

    const squidRetentionDays = settings.retentionDaysSquid ?? 60;
    const netflowRetentionDays = settings.retentionDaysFlows ?? 7;

    return NextResponse.json({
      success: true,
      lastRun: meta ? JSON.parse(meta.value) : null,
      rawLogCount: squidRaw?.count || 0,
      summaryCount: squidSummary?.count || 0,
      squid: {
        rawLogCount: squidRaw?.count || 0,
        summaryCount: squidSummary?.count || 0,
        retentionDays: squidRetentionDays,
      },
      netflow: {
        rawFlowCount: flowRaw?.count || 0,
        minuteRollupCount: flowMin?.count || 0,
        hourlyRollupCount: flowHr?.count || 0,
        summaryCount: flowSummary?.count || 0,
        retentionDays: netflowRetentionDays,
      },
      dbSizeBytes,
      dbSizeFormatted: formatBytes(dbSizeBytes),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to execute retention purge or database vacuum' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const result = runRetentionJob({
      squidDays: body.squidDays !== undefined ? Number(body.squidDays) : (body.retentionDays ? Number(body.retentionDays) : 60),
      netflowDays: body.netflowDays !== undefined ? Number(body.netflowDays) : 7,
      runVacuum: Boolean(body.runVacuum),
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[API Retention] GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
