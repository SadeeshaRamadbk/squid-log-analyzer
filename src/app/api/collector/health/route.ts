import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { formatTimestamp, getSystemSettings } from '@/lib/settings';

export async function GET() {
  try {
    const db = getDatabase();
    const settings = getSystemSettings();
    const tz = settings.timezone || 'Asia/Colombo';
    const now = Date.now();

    // NetFlow status
    const netflowRow = db.prepare('SELECT MAX(timestamp) AS lastFlowTime, COUNT(*) AS totalFlows FROM netflow_logs').get() as any;
    const lastFlowTime = Number(netflowRow?.lastFlowTime || 0);
    const totalFlows = Number(netflowRow?.totalFlows || 0);

    const sixtySecAgo = now - 60 * 1000;
    const recentFlowsRow = db.prepare('SELECT COUNT(*) AS count FROM netflow_logs WHERE timestamp >= ?').get(sixtySecAgo) as any;
    const flowsPerSecond = Math.round(((Number(recentFlowsRow?.count || 0)) / 60) * 10) / 10;

    let netflowStatus: 'green' | 'amber' | 'red' = 'red';
    if (lastFlowTime > 0) {
      const diffSec = (now - lastFlowTime) / 1000;
      if (diffSec <= 45) {
        netflowStatus = 'green';
      } else if (diffSec <= 300) {
        netflowStatus = 'amber';
      }
    }

    // Squid status
    const squidRow = db.prepare('SELECT MAX(timestamp) AS lastSquidTime, COUNT(*) AS totalSquidLogs FROM raw_logs').get() as any;
    const lastSquidTime = Number(squidRow?.lastSquidTime || 0);
    const totalSquidLogs = Number(squidRow?.totalSquidLogs || 0);

    let squidStatus: 'green' | 'amber' | 'red' = 'red';
    if (lastSquidTime > 0) {
      const diffSec = (now - lastSquidTime) / 1000;
      if (diffSec <= 60) {
        squidStatus = 'green';
      } else if (diffSec <= 600) {
        squidStatus = 'amber';
      }
    }

    // Syslog status
    let lastSyslogTime = 0;
    let totalSyslogEvents = 0;
    let syslogPerSecond = 0;
    let syslogStatus: 'green' | 'amber' | 'red' = 'red';

    try {
      const syslogRow = db.prepare('SELECT MAX(timestamp) AS lastSyslogTime, COUNT(*) AS totalSyslogEvents FROM syslog_events').get() as any;
      lastSyslogTime = Number(syslogRow?.lastSyslogTime || 0);
      totalSyslogEvents = Number(syslogRow?.totalSyslogEvents || 0);

      const recentSyslogRow = db.prepare('SELECT COUNT(*) AS count FROM syslog_events WHERE timestamp >= ?').get(sixtySecAgo) as any;
      syslogPerSecond = Math.round(((Number(recentSyslogRow?.count || 0)) / 60) * 10) / 10;

      if (lastSyslogTime > 0) {
        const diffSec = (now - lastSyslogTime) / 1000;
        if (diffSec <= 60) {
          syslogStatus = 'green';
        } else if (diffSec <= 600) {
          syslogStatus = 'amber';
        }
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        netflow: {
          status: netflowStatus,
          lastFlowTime,
          formattedLastFlow: lastFlowTime > 0 ? formatTimestamp(lastFlowTime, tz) : 'No flows yet',
          flowsPerSecond,
          totalFlows,
          port: 2055,
        },
        squid: {
          status: squidStatus,
          lastSquidTime,
          formattedLastSquid: lastSquidTime > 0 ? formatTimestamp(lastSquidTime, tz) : 'No logs yet',
          totalSquidLogs,
          port: settings.squidPort || 3128,
        },
        syslog: {
          status: syslogStatus,
          lastSyslogTime,
          formattedLastSyslog: lastSyslogTime > 0 ? formatTimestamp(lastSyslogTime, tz) : 'No events yet',
          eventsPerSecond: syslogPerSecond,
          totalSyslogEvents,
          port: parseInt(process.env.SYSLOG_PORT || '1514', 10),
        },
        systemTime: formatTimestamp(now, tz),
        timezone: tz,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check collector health' },
      { status: 500 }
    );
  }
}
