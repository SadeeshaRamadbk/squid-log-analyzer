import { NextRequest, NextResponse } from 'next/server';
import { getEnrichedIp } from '@/lib/enrichment';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');

    if (!ip) {
      return NextResponse.json({ success: false, error: 'IP is required' }, { status: 400 });
    }

    const data = await getEnrichedIp(ip);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API /api/enrichment GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
