import { NextRequest, NextResponse } from 'next/server';
import { getFirewallBlockStats } from '@/lib/db/syslog-queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const timeWindow = searchParams.get('timeWindow') as any || undefined;
    const suppressNoise = searchParams.get('suppressNoise') !== 'false';

    const blocksData = getFirewallBlockStats({
      startDate,
      endDate,
      timeWindow,
      suppressNoise,
    });

    return NextResponse.json({
      success: true,
      data: blocksData,
    });
  } catch (error: any) {
    console.error('API /api/syslog/blocks GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
