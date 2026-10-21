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

          // Latest softflowd flow (uses timestamp index)
          const latestFlow = db.prepare(`
            SELECT id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol, service_name, bytes, packets
            FROM netflow_logs
            ORDER BY timestamp DESC
            LIMIT 1
          `).get() as any;

          // Latest Squid request (uses timestamp index and correct schema columns)
          const latestSquid = db.prepare(`
            SELECT id, timestamp, client_ip, domain, method, result_code, is_blocked, bytes
            FROM raw_logs
            ORDER BY timestamp DESC
            LIMIT 1
          `).get() as any;

          // Instant count from sqlite_sequence (0.01ms) to eliminate background database CPU load
          let totalFlows = 0;
          let totalRequests = 0;

          try {
            const flowSeq = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'netflow_logs'").get() as any;
            totalFlows = flowSeq?.seq ? Number(flowSeq.seq) : 0;
          } catch {}

          try {
            const squidSeq = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'raw_logs'").get() as any;
            totalRequests = squidSeq?.seq ? Number(squidSeq.seq) : 0;
          } catch {}

          sendEvent('heartbeat', {
            timestamp: Date.now(),
            netflow: {
              latestFlow: latestFlow || null,
              totalFlows,
            },
            squid: {
              latestRequest: latestSquid || null,
              totalRequests,
            },
          });
        } catch (err: any) {
          console.warn('[SSE Stream] Heartbeat query error:', err?.message);
          sendEvent('stream_error', { error: err?.message || 'Stream error' });
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
