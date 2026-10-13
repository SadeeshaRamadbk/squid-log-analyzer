import { NextRequest, NextResponse } from 'next/server';
import { runRetentionJob } from '@/lib/db/retention';
import { getDatabase, getDatabasePath } from '@/lib/db';
import { formatBytes } from '@/lib/formatters';
import fs from 'fs';

export async function GET() {
  try {
    const db = getDatabase();
    const meta = db.prepare("SELECT value, updated_at FROM system_meta WHERE key = 'last_retention_run'").get() as any;
    
    // Squid counts
    const squidRaw = db.prepare('SELECT count(*) as count FROM raw_logs').get() as any;
    const squidSummary = db.prepare('SELECT count(*) as count FROM daily_summaries').get() as any;

    // pfSense NetFlow counts
    const flowRaw = db.prepare('SELECT count(*) as count FROM netflow_logs').get() as any;
    const flowSummary = db.prepare('SELECT count(*) as count FROM netflow_daily_summaries').get() as any;

    // Database file size on disk
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

    return NextResponse.json({
      success: true,
      lastRun: meta ? JSON.parse(meta.value) : null,
      rawLogCount: squidRaw?.count || 0,
      summaryCount: squidSummary?.count || 0,
      squid: {
        rawLogCount: squidRaw?.count || 0,
        summaryCount: squidSummary?.count || 0,
        retentionDays: 60,
      },
      netflow: {
        rawFlowCount: flowRaw?.count || 0,
        summaryCount: flowSummary?.count || 0,
        retentionDays: 7,
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
    const body = await request.json().catch(() => ({}));
    const retentionDays = Number(body.retentionDays) || 60;
    const result = runRetentionJob(retentionDays);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
