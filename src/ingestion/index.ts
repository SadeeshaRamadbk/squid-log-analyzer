import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { SshLogTailer } from './ssh-tailer';
import { BatchInserter } from './batch-inserter';
import { runRetentionJob } from '../lib/db/retention';

function main() {
  console.log('====================================================');
  console.log('   Squid Proxy Log Ingestion Service (nipponbpo.local)');
  console.log('====================================================');

  // Run retention job on startup
  try {
    const retentionDays = Number(process.env.RETENTION_DAYS) || 60;
    runRetentionJob(retentionDays);
  } catch (err) {
    console.error('[Ingestion Startup] Warning: Failed to run retention job:', err);
  }

  // Periodic retention job (runs every 24 hours)
  const retentionInterval = setInterval(() => {
    try {
      runRetentionJob();
    } catch (err) {
      console.error('[Retention Interval] Error running retention check:', err);
    }
  }, 24 * 60 * 60 * 1000);

  const batchSize = Number(process.env.BATCH_SIZE) || 500;
  const flushIntervalMs = Number(process.env.BATCH_FLUSH_INTERVAL_MS) || 2000;

  const inserter = new BatchInserter(batchSize, flushIntervalMs);

  const sshHost = process.env.SQUID_SSH_HOST || 'squid.nipponbpo.local';
  const sshPort = Number(process.env.SQUID_SSH_PORT) || 22;
  const sshUser = process.env.SQUID_SSH_USER || 'squiduser';
  const sshPassword = process.env.SQUID_SSH_PASSWORD;
  const sshKeyPath = process.env.SQUID_SSH_KEY_PATH;
  const logPath = process.env.SQUID_LOG_PATH || '/var/log/squid/access.log';

  console.log(`[Ingestion] Target: ${sshUser}@${sshHost}:${sshPort}`);
  console.log(`[Ingestion] Log path: ${logPath}`);
  console.log(`[Ingestion] Batch size: ${batchSize}, Flush interval: ${flushIntervalMs}ms`);

  const tailer = new SshLogTailer(
    {
      host: sshHost,
      port: sshPort,
      username: sshUser,
      password: sshPassword,
      privateKeyPath: sshKeyPath,
      logPath,
      reconnectIntervalMs: 5000,
    },
    inserter
  );

  tailer.start();

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[Ingestion] Shutting down service cleanly...');
    clearInterval(retentionInterval);
    tailer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
