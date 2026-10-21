import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSyslogInserter } from '@/syslog-collector/batch-syslog-inserter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const inserter = getSyslogInserter();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const sendEvent = (event: string, data: any) => {
        if (isClosed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          isClosed = true;
        }
      };

      // 1. Initial connection greeting
      sendEvent('connected', {
        timestamp: Date.now(),
        message: 'Syslog live SSE stream connected',
      });

      // 2. Fetch latest 10 events from DB as initial backlog
      try {
        const db = getDatabase();
        const initialRows = db.prepare(`
          SELECT id, timestamp, facility, facility_label, severity, severity_label,
                 hostname, app_name, proc_id, message
          FROM syslog_events
          ORDER BY timestamp DESC
          LIMIT 10
        `).all() as any[];

        if (initialRows && initialRows.length > 0) {
          sendEvent('initial', initialRows.reverse());
        }
      } catch (err) {
        console.warn('[Syslog SSE] Error reading backlog:', err);
      }

      // 3. Attach real-time listener to the UDP batch inserter
      const onSyslogEvent = (event: any) => {
        sendEvent('syslog', event);
      };

      inserter.on('event', onSyslogEvent);

      // 4. Heartbeat interval every 10 seconds
      const heartbeat = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeat);
          inserter.removeListener('event', onSyslogEvent);
          return;
        }
        sendEvent('ping', { timestamp: Date.now() });
      }, 10000);

      // Handle stream abort
      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(heartbeat);
        inserter.removeListener('event', onSyslogEvent);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
