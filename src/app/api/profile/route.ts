import { NextRequest, NextResponse } from 'next/server';
import { getIpProfile, searchIps } from '@/lib/db/profile-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');
    const search = searchParams.get('search');

    if (search !== null) {
      const results = searchIps(search);
      return NextResponse.json({ success: true, results });
    }

    if (!ip) {
      return NextResponse.json(
        { success: false, error: 'Missing required "ip" or "search" parameter' },
        { status: 400 }
      );
    }

    const profile = getIpProfile(ip);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('API /api/profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch IP profile' },
      { status: 500 }
    );
  }
}
