import { NextRequest, NextResponse } from 'next/server';
import {
  getOverviewMetrics,
  getTopDomains,
  getTopClientIps,
  getRequestsOverTime,
  getDistinctClientIps,
  getDateRange,
  DashboardFilters,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const clientIp = searchParams.get('clientIp') || undefined;
    const timeWindow = (searchParams.get('timeWindow') as '30m' | '1h') || undefined;

    const filters: DashboardFilters = { startDate, endDate, clientIp, timeWindow };

    const overview = getOverviewMetrics(filters);
    const topDomains = getTopDomains(filters, 10, overview.totalRequests);
    const topClients = getTopClientIps(filters, 10, overview.totalRequests);
    const requestsOverTime = getRequestsOverTime(filters);
    const availableClientIps = getDistinctClientIps();
    const dateRange = getDateRange();

    return NextResponse.json({
      success: true,
      data: {
        overview,
        topDomains,
        topClients,
        requestsOverTime,
        filterOptions: {
          availableClientIps,
          minDate: dateRange.minDate,
          maxDate: dateRange.maxDate,
        },
      },
    });
  } catch (error: any) {
    console.error('API /api/stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch analytics stats' },
      { status: 500 }
    );
  }
}
