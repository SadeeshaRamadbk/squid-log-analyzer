import { NextRequest, NextResponse } from 'next/server';
import { runRetentionJob } from '@/lib/db/retention';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = getDatabase();
    const meta = db.prepare("SELECT value, updated_at FROM system_meta WHERE key = 'last_retention_run'").get() as any;
    const rawCount = db.prepare('SELECT count(*) as count FROM raw_logs').get() as any;
    const summaryCount = db.prepare('SELECT count(*) as count FROM daily_summaries').get() as any;

    return NextResponse.json({
      success: true,
      lastRun: meta ? JSON.parse(meta.value) : null,
      rawLogCount: rawCount?.count || 0,
      summaryCount: summaryCount?.count || 0,
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
