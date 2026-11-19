import { NextRequest, NextResponse } from 'next/server';
import { getAllHostsOverview, HostsOverviewOptions } from '@/lib/db/profile-queries';
import { getUserFromRequest } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const department = searchParams.get('department') || undefined;
    const filter = (searchParams.get('filter') as HostsOverviewOptions['filter']) || undefined;
    const sort = (searchParams.get('sort') as HostsOverviewOptions['sort']) || undefined;
    const direction = (searchParams.get('direction') as HostsOverviewOptions['direction']) || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const data = getAllHostsOverview({
      search,
      department,
      filter,
      sort,
      direction,
      limit,
      offset,
    });

    const user = getUserFromRequest(request);
    recordAuditLog({
      actor: user?.username || 'viewer',
      action: 'hosts_directory_view',
      target: search ? `search:${search}` : 'all_hosts',
      details: { totalFiltered: data.totalFiltered, department },
      status: 'success',
      ip_address: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('API /api/hosts error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch hosts overview' },
      { status: 500 }
    );
  }
}
