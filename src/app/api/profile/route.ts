import { NextRequest, NextResponse } from 'next/server';
import { getIpProfile, searchGlobal } from '@/lib/db/profile-queries';
import { getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');
    const search = searchParams.get('search');
    const user = getUserFromRequest(request);

    if (search !== null) {
      const globalData = searchGlobal(search);
      return NextResponse.json({
        success: true,
        results: globalData.ips,
        global: globalData,
      });
    }

    if (!ip) {
      return NextResponse.json(
        { success: false, error: 'Missing required "ip" or "search" parameter' },
        { status: 400 }
      );
    }

    const profile = getIpProfile(ip);

    // Audit log: who opened which employee's timeline / dossier
    recordAuditLog({
      actor: user?.username || 'viewer',
      action: 'timeline_view',
      target: profile.mapping?.userName ? `${ip} (${profile.mapping.userName})` : ip,
      details: { department: profile.mapping?.department, totalRequests: profile.squid.totalRequests },
      status: 'success',
      ip_address: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('API /api/profile error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch IP profile' },
      { status: 500 }
    );
  }
}
