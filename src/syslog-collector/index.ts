import dgram from 'dgram';
import dotenv from 'dotenv';
import { parseSyslogMessage } from './syslog-parser';
import { getSyslogInserter } from './batch-syslog-inserter';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = parseInt(process.env.SYSLOG_PORT || '1514', 10);
const HOST = process.env.SYSLOG_HOST || '0.0.0.0';

const inserter = getSyslogInserter();
const server = dgram.createSocket('udp4');

let receivedCount = 0;
let lastReportTime = Date.now();

server.on('error', (err) => {
  console.error('[Syslog Collector] Socket error:\n', err);
  server.close();
});

server.on('message', (msg, rinfo) => {
  try {
    const rawText = msg.toString('utf8');
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);

    for (const line of lines) {
      const event = parseSyslogMessage(line, rinfo.address);
      inserter.push(event);
      receivedCount++;
    }

    const now = Date.now();
    if (now - lastReportTime >= 10000) {
      console.log(
        `[Syslog Collector] Telemetry: ${receivedCount} events received (${inserter.getTotalIngested()} committed to SQLite)`
      );
      lastReportTime = now;
    }
  } catch (err) {
    console.warn('[Syslog Collector] Error processing packet:', err);
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log('='.repeat(70));
  console.log('  NIPPON BPO NOC - SYSLOG UDP COLLECTOR (RFC 3164 / RFC 5424)');
  console.log('='.repeat(70));
  console.log(`  Status    : LISTENING on UDP ${address.address}:${address.port}`);
  console.log(`  Source IP : Ready to receive logs from pfSense / Squid at 192.168.0.1`);
  console.log(`  Database  : SQLite (syslog_events) with 1000ms batch flush`);
  console.log('='.repeat(70));
  console.log('pfSense Setup Tip:');
  console.log(`  Go to: Status > System Logs > Settings > Remote Logging Options`);
  console.log(`  Enable Remote Logging and set Remote log servers to: <this-machine-ip>:${address.port}`);
  console.log('='.repeat(70));
});

server.bind(PORT, HOST);

function shutdown() {
  console.log('\n[Syslog Collector] Shutting down gracefully...');
  server.close(() => {
    console.log('[Syslog Collector] UDP socket closed.');
    inserter.stop();
    console.log('[Syslog Collector] Inserter queue flushed. Exiting.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
