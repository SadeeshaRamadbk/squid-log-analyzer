import { NextRequest, NextResponse } from 'next/server';
import { getFailedRequestsSummary } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const clientIp = searchParams.get('clientIp') || undefined;
    const timeWindow = (searchParams.get('timeWindow') as '30m' | '1h') || undefined;

    const data = getFailedRequestsSummary({ startDate, endDate, clientIp, timeWindow });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API /api/squid/errors GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
