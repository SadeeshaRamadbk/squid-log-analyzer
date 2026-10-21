import { NextRequest, NextResponse } from 'next/server';
import { getSyslogStats } from '@/lib/db/syslog-queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const timeWindow = searchParams.get('timeWindow') || undefined;

    const stats = getSyslogStats({ startDate, endDate, timeWindow });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('API /api/syslog/stats GET error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch syslog statistics' },
      { status: 500 }
    );
  }
}
