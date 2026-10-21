import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCategoriesMap,
  setCustomDomainCategory,
  deleteCustomDomainCategory,
  DomainCategory,
  getDomainCategory,
  getDepartmentCategorySummary,
} from '@/lib/categories';
import { getDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'map' | 'share' | 'departments'
    const clientIp = searchParams.get('clientIp');

    if (mode === 'departments') {
      const departments = getDepartmentCategorySummary();
      return NextResponse.json({ success: true, departments });
    }

    if (mode === 'share') {
      const db = getDatabase();
      // Aggregate category breakdown
      let rows: any[] = [];
      if (clientIp) {
        rows = db.prepare(`
          SELECT domain, COALESCE(SUM(request_count), 0) as totalRequests, COALESCE(SUM(bytes), 0) as totalBytes
          FROM daily_summaries
          WHERE client_ip = ?
          GROUP BY domain
        `).all(clientIp);
      } else {
        rows = db.prepare(`
          SELECT domain, COALESCE(SUM(request_count), 0) as totalRequests, COALESCE(SUM(bytes), 0) as totalBytes
          FROM daily_summaries
          GROUP BY domain
        `).all();
      }

      const categoryTotals: Record<string, { requests: number; bytes: number }> = {};
      let totalAllRequests = 0;

      for (const r of rows) {
        const cat = getDomainCategory(r.domain);
        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { requests: 0, bytes: 0 };
        }
        categoryTotals[cat].requests += Number(r.totalRequests || 0);
        categoryTotals[cat].bytes += Number(r.totalBytes || 0);
        totalAllRequests += Number(r.totalRequests || 0);
      }

      const share = Object.entries(categoryTotals).map(([cat, val]) => ({
        category: cat,
        requests: val.requests,
        bytes: val.bytes,
        percentage: totalAllRequests > 0 ? Number(((val.requests / totalAllRequests) * 100).toFixed(1)) : 0,
      })).sort((a, b) => b.requests - a.requests);

      return NextResponse.json({ success: true, share });
    }

    const categories = getAllCategoriesMap();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('API /api/categories GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to edit domain categorization' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { domain, category } = body;

    if (!domain || !category) {
      return NextResponse.json(
        { success: false, error: 'Domain and category are required' },
        { status: 400 }
      );
    }

    setCustomDomainCategory(domain, category as DomainCategory);
    return NextResponse.json({ success: true, message: `Updated category for ${domain}` });
  } catch (error: any) {
    console.error('API /api/categories POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (user && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required to delete domain category rule' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain parameter is required' }, { status: 400 });
    }

    deleteCustomDomainCategory(domain);
    return NextResponse.json({ success: true, message: `Reset category rule for ${domain}` });
  } catch (error: any) {
    console.error('API /api/categories DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
