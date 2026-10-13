import { NextRequest, NextResponse } from 'next/server';
import {
  getNetflowMetrics,
  getNetflowThroughput,
  getTopTalkers,
  getTopDestinations,
  getTopServices,
  getProtocolDistribution,
  getDistinctNetflowOptions,
  NetflowFilters,
} from '@/lib/db/netflow-queries';
import { getDistinctClientIps, getDateRange } from '@/lib/db/queries';

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

    const filters: NetflowFilters = {
      startDate,
      endDate,
      srcIp,
      dstIp,
      protocol,
      serviceName,
      timeWindow,
    };

    const overview = getNetflowMetrics(filters);
    const throughput = getNetflowThroughput(filters);
    const topTalkers = getTopTalkers(filters, 10);
    const topDestinations = getTopDestinations(filters, 10);
    const topServices = getTopServices(filters, 10);
    const protocols = getProtocolDistribution(filters);
    const netflowOptions = getDistinctNetflowOptions();
    const availableClientIps = getDistinctClientIps();
    const dateRange = getDateRange();

    return NextResponse.json({
      success: true,
      data: {
        overview,
        throughput,
        topTalkers,
        topDestinations,
        topServices,
        protocols,
        filterOptions: {
          protocols: netflowOptions.protocols,
          services: netflowOptions.services,
          availableClientIps,
          minDate: dateRange.minDate,
          maxDate: dateRange.maxDate,
        },
      },
    });
  } catch (error: any) {
    console.error('API /api/netflow/stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch NetFlow analytics' },
      { status: 500 }
    );
  }
}
