import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { formatTimestamp, getSystemSettings } from '@/lib/settings';
import { resolveServiceName } from '@/netflow-collector/service-ports';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portStr = searchParams.get('port');
    if (!portStr) {
      return NextResponse.json({ success: false, error: 'Port parameter is required' }, { status: 400 });
    }
    const port = parseInt(portStr, 10);
    const protocol = searchParams.get('protocol') || undefined;

    const db = getDatabase();
    const settings = getSystemSettings();
    const tz = settings.timezone || 'Asia/Colombo';

    const conditions = ['(dst_port = ? OR src_port = ?)'];
    const params: any[] = [port, port];
    if (protocol) {
      conditions.push('protocol = ?');
      params.push(protocol);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;

    const statRow = db.prepare(`
      SELECT
        COUNT(*) AS totalFlows,
        COALESCE(SUM(bytes), 0) AS totalBytes,
        COALESCE(SUM(packets), 0) AS totalPackets,
        COUNT(DISTINCT src_ip) AS uniqueSources,
        COUNT(DISTINCT dst_ip) AS uniqueDestinations,
        MIN(timestamp) AS firstSeen,
        MAX(timestamp) AS lastSeen
      FROM netflow_logs
      ${where}
    `).get(...params) as any;

    const topTalkers = db.prepare(`
      SELECT
        r.src_ip AS srcIp,
        m.user_name AS userName,
        m.department AS department,
        COUNT(*) AS flowCount,
        COALESCE(SUM(r.bytes), 0) AS bytes,
        COALESCE(SUM(r.packets), 0) AS packets
      FROM netflow_logs r
      LEFT JOIN ip_mappings m ON r.src_ip = m.client_ip
      ${where}
      GROUP BY r.src_ip
      ORDER BY bytes DESC
      LIMIT 10
    `).all(...params) as any[];

    const recentFlows = db.prepare(`
      SELECT
        r.id,
        r.timestamp,
        r.src_ip AS srcIp,
        r.dst_ip AS dstIp,
        r.src_port AS srcPort,
        r.dst_port AS dstPort,
        r.protocol,
        r.service_name AS serviceName,
        r.bytes,
        r.packets,
        r.tcp_flags AS tcpFlags
      FROM netflow_logs r
      ${where}
      ORDER BY r.timestamp DESC
      LIMIT 15
    `).all(...params) as any[];

    return NextResponse.json({
      success: true,
      data: {
        port,
        serviceName: resolveServiceName(port),
        protocol: protocol || 'TCP/UDP',
        totalFlows: Number(statRow?.totalFlows || 0),
        totalBytes: Number(statRow?.totalBytes || 0),
        totalPackets: Number(statRow?.totalPackets || 0),
        uniqueSources: Number(statRow?.uniqueSources || 0),
        uniqueDestinations: Number(statRow?.uniqueDestinations || 0),
        firstSeen: statRow?.firstSeen ? formatTimestamp(Number(statRow.firstSeen), tz) : '-',
        lastSeen: statRow?.lastSeen ? formatTimestamp(Number(statRow.lastSeen), tz) : '-',
        topTalkers: topTalkers.map((t) => ({
          srcIp: t.srcIp,
          userName: t.userName || null,
          department: t.department || null,
          flowCount: Number(t.flowCount),
          bytes: Number(t.bytes),
          packets: Number(t.packets),
        })),
        recentFlows: recentFlows.map((f) => ({
          id: f.id,
          timestamp: f.timestamp,
          formattedTime: formatTimestamp(f.timestamp, tz),
          srcIp: f.srcIp,
          dstIp: f.dstIp,
          srcPort: f.srcPort,
          dstPort: f.dstPort,
          protocol: f.protocol,
          serviceName: f.serviceName,
          bytes: Number(f.bytes),
          packets: Number(f.packets),
          tcpFlags: f.tcpFlags || '-',
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch port drilldown' }, { status: 500 });
  }
}
