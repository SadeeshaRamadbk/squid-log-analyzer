import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import dgram from 'dgram';
import { parseNetFlowV5Packet } from './netflow-v5-parser';
import { BatchFlowInserter } from './batch-flow-inserter';

const PORT = Number(process.env.NETFLOW_PORT) || 2055;
const HOST = process.env.NETFLOW_BIND_HOST || '0.0.0.0';

function startCollector() {
  console.log('========================================================');
  console.log('   pfSense softflowd 1.2.6_4 NetFlow UDP Collector');
  console.log('========================================================');

  const batchSize = Number(process.env.NETFLOW_BATCH_SIZE) || 500;
  const flushIntervalMs = Number(process.env.NETFLOW_FLUSH_INTERVAL_MS) || 2000;
  const inserter = new BatchFlowInserter(batchSize, flushIntervalMs);

  const server = dgram.createSocket('udp4');

  server.on('error', (err) => {
    console.error(`[NetFlow UDP] Server error: ${err.message}`);
    server.close();
  });

  server.on('message', (msg, rinfo) => {
    try {
      const flows = parseNetFlowV5Packet(msg);
      if (flows.length > 0) {
        inserter.pushBatch(flows);
      }
    } catch (parseErr: any) {
      console.warn(`[NetFlow UDP] Failed to parse datagram from ${rinfo.address}:${rinfo.port}: ${parseErr.message}`);
    }
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`[NetFlow UDP] Collector listening on ${address.address}:${address.port}`);
    console.log(`[NetFlow UDP] Ready to receive softflowd 1.2.6_4 exported flows from pfSense.`);
  });

  server.bind(PORT, HOST);

  const shutdown = () => {
    console.log('\n[NetFlow UDP] Closing collector...');
    server.close();
    inserter.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startCollector();
