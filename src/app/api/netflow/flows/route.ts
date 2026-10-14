import { NextRequest, NextResponse } from 'next/server';
import { getRecentFlows, NetflowFilters } from '@/lib/db/netflow-queries';
import { sanitizePagination } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const srcIp = searchParams.get('srcIp') || undefined;
    const dstIp = searchParams.get('dstIp') || undefined;
    const protocol = searchParams.get('protocol') || undefined;
    const serviceName = searchParams.get('serviceName') || undefined;
    const timeWindow = (searchParams.get('timeWindow') as '30m' | '1h') || undefined;
    const hideFirewallTraffic = searchParams.has('hideFirewallTraffic')
      ? searchParams.get('hideFirewallTraffic') === 'true'
      : undefined;
    const hideProxyHop = searchParams.has('hideProxyHop')
      ? searchParams.get('hideProxyHop') === 'true'
      : undefined;
    const trafficType = (searchParams.get('trafficType') as 'all' | 'external' | 'internal') || undefined;
    const search = searchParams.get('search') || undefined;

    const { page, limit, offset } = sanitizePagination(searchParams.get('page'), searchParams.get('limit'));

    const filters: NetflowFilters = {
      startDate,
      endDate,
      srcIp,
      dstIp,
      protocol,
      serviceName,
      timeWindow,
      hideFirewallTraffic,
      hideProxyHop,
      trafficType,
      search,
    };

    const { records, total } = getRecentFlows(filters, limit, offset);

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
    console.error('API /api/netflow/flows error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch flows' },
      { status: 500 }
    );
  }
}
