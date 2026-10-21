import { NextRequest, NextResponse } from 'next/server';
import { getSyslogEvents, getSyslogFilterOptions } from '@/lib/db/syslog-queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const appName = searchParams.get('appName') || undefined;
    const facility = searchParams.get('facility') || undefined;
    const search = searchParams.get('search') || undefined;
    const severityLevel = (searchParams.get('severityLevel') as any) || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const timeWindow = (searchParams.get('timeWindow') as any) || undefined;

    const data = getSyslogEvents({
      page,
      limit,
      appName,
      facility,
      search,
      severityLevel,
      startDate,
      endDate,
      timeWindow,
    });

    const includeFilters = searchParams.get('includeFilters') === 'true';
    const filterOptions = includeFilters ? getSyslogFilterOptions() : undefined;

    return NextResponse.json({
      success: true,
      data: data.events,
      pagination: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      },
      filterOptions,
    });
  } catch (error: any) {
    console.error('API /api/syslog GET error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch syslog events' },
      { status: 500 }
    );
  }
}
