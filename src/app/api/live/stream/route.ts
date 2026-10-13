import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

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

      // Send initial connection event
      sendEvent('connected', {
        timestamp: Date.now(),
        message: 'Real-time SSE stream connected',
      });

      // Heartbeat & telemetry stream every 2.5 seconds
      const interval = setInterval(() => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          const db = getDatabase();
          
          // Latest softflowd flow
          const latestFlow = db.prepare(`
            SELECT id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol, service_name, bytes, packets
            FROM netflow_logs
            ORDER BY timestamp DESC
            LIMIT 1
          `).get() as any;

          // Latest Squid request
          const latestSquid = db.prepare(`
            SELECT id, timestamp, client_ip, domain, action, http_status, bytes
            FROM raw_logs
            ORDER BY timestamp DESC
            LIMIT 1
          `).get() as any;

          const flowCountRow = db.prepare('SELECT count(*) as count FROM netflow_logs').get() as any;
          const squidCountRow = db.prepare('SELECT count(*) as count FROM raw_logs').get() as any;

          sendEvent('heartbeat', {
            timestamp: Date.now(),
            netflow: {
              latestFlow: latestFlow || null,
              totalFlows: flowCountRow?.count || 0,
            },
            squid: {
              latestRequest: latestSquid || null,
              totalRequests: squidCountRow?.count || 0,
            },
          });
        } catch (err: any) {
          sendEvent('stream_error', { error: err.message });
        }
      }, 2500);

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
      'X-Accel-Buffering': 'no',
    },
  });
}
