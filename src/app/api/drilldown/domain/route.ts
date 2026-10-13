import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { formatTimestamp, getSystemSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain parameter is required' }, { status: 400 });
    }

    const db = getDatabase();
    const settings = getSystemSettings();
    const tz = settings.timezone || 'Asia/Colombo';

    const statRow = db.prepare(`
      SELECT
        COUNT(*) AS totalRequests,
        COALESCE(SUM(bytes), 0) AS totalBytes,
        COALESCE(SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount,
        MIN(timestamp) AS firstSeen,
        MAX(timestamp) AS lastSeen
      FROM raw_logs
      WHERE domain = ?
    `).get(domain) as any;

    const topClients = db.prepare(`
      SELECT
        r.client_ip AS clientIp,
        m.user_name AS userName,
        m.department AS department,
        COUNT(*) AS requestCount,
        COALESCE(SUM(r.bytes), 0) AS bytes,
        COALESCE(SUM(CASE WHEN r.is_blocked = 1 THEN 1 ELSE 0 END), 0) AS blockedCount
      FROM raw_logs r
      LEFT JOIN ip_mappings m ON r.client_ip = m.client_ip
      WHERE r.domain = ?
      GROUP BY r.client_ip
      ORDER BY requestCount DESC
      LIMIT 10
    `).all(domain) as any[];

    const recentRequests = db.prepare(`
      SELECT
        r.id,
        r.timestamp,
        r.client_ip AS clientIp,
        r.method,
        r.result_code AS resultCode,
        r.is_blocked AS isBlocked,
        r.url,
        r.bytes
      FROM raw_logs r
      WHERE r.domain = ?
      ORDER BY r.timestamp DESC
      LIMIT 15
    `).all(domain) as any[];

    return NextResponse.json({
      success: true,
      data: {
        domain,
        totalRequests: Number(statRow?.totalRequests || 0),
        totalBytes: Number(statRow?.totalBytes || 0),
        blockedCount: Number(statRow?.blockedCount || 0),
        firstSeen: statRow?.firstSeen ? formatTimestamp(Number(statRow.firstSeen), tz) : '-',
        lastSeen: statRow?.lastSeen ? formatTimestamp(Number(statRow.lastSeen), tz) : '-',
        topClients: topClients.map((c) => ({
          clientIp: c.clientIp,
          userName: c.userName || null,
          department: c.department || null,
          requestCount: Number(c.requestCount),
          bytes: Number(c.bytes),
          blockedCount: Number(c.blockedCount),
        })),
        recentRequests: recentRequests.map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          formattedTime: formatTimestamp(r.timestamp, tz),
          clientIp: r.clientIp,
          method: r.method,
          resultCode: r.resultCode,
          isBlocked: Boolean(r.isBlocked),
          url: r.url || null,
          bytes: Number(r.bytes),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch domain drilldown' }, { status: 500 });
  }
}
