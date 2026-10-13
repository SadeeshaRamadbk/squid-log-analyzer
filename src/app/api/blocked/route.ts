import { NextRequest, NextResponse } from 'next/server';
import { getBlockedRequests, DashboardFilters } from '@/lib/db/queries';
import { sanitizePagination } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const clientIp = searchParams.get('clientIp') || undefined;
    const timeWindow = (searchParams.get('timeWindow') as '30m' | '1h') || undefined;
    const { page, limit, offset } = sanitizePagination(searchParams.get('page'), searchParams.get('limit'));

    const filters: DashboardFilters = { startDate, endDate, clientIp, timeWindow };
    const { records, total } = getBlockedRequests(filters, limit, offset);

    return NextResponse.json({
      success: true,
      data: {
        records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('API /api/blocked error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch blocked requests' },
      { status: 500 }
    );
  }
}
