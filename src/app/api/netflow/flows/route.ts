import { NextRequest, NextResponse } from 'next/server';
import { getRecentFlows, NetflowFilters } from '@/lib/db/netflow-queries';

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

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

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
