import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import Database from 'better-sqlite3';
import { getDatabasePath, closeDatabase, reopenDatabase } from '@/lib/db';
import { getUserFromRequest, getSessionTokenFromRequest, validateSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'utf-8');

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin role required to restore database backups' },
      { status: 403 }
    );
  }

  // Preserve current session across the restore cutover
  const sessionToken = getSessionTokenFromRequest(request);
  const currentSession = sessionToken ? validateSession(sessionToken) : null;

  const targetDbPath = getDatabasePath();
  const targetDir = path.dirname(targetDbPath);
  const tempDir = path.resolve(process.cwd(), 'backups', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempUploadedPath = path.join(
    tempDir,
    `squid_restore_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendStage = (payload: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
        } catch {
          isClosed = true;
        }
      };

      let oldBackupPath: string | null = null;

      try {
        const contentType = request.headers.get('content-type') || '';

        // Step 1: Receiving & streaming uploaded file directly to disk
        sendStage({
          stage: 'receiving',
          percent: 5,
          message: 'Receiving database backup stream on server...',
        });

        if (contentType.includes('application/octet-stream') || !contentType.includes('multipart/form-data')) {
          if (!request.body) {
            throw new Error('No binary file stream received in request body');
          }
          const writeStream = fs.createWriteStream(tempUploadedPath, { highWaterMark: 1024 * 1024 });
          await pipeline(Readable.fromWeb(request.body as any), writeStream);
        } else {
          const formData = await request.formData();
          const file = formData.get('backupFile') as File | null;
          if (!file) {
            throw new Error('No backup file provided in upload');
          }
          const nodeStream = Readable.fromWeb(file.stream() as any);
          const writeStream = fs.createWriteStream(tempUploadedPath, { highWaterMark: 1024 * 1024 });
          await pipeline(nodeStream, writeStream);
        }

        const stats = fs.statSync(tempUploadedPath);
        if (stats.size < 100) {
          throw new Error('Uploaded file is too small to be a valid SQLite database');
        }

        // Step 2: Validating SQLite header & integrity check
        sendStage({
          stage: 'validating',
          percent: 75,
          message: 'Verifying SQLite 3 format and page integrity...',
          fileSizeBytes: stats.size,
        });

        const fd = fs.openSync(tempUploadedPath, 'r');
        const headerBuffer = Buffer.alloc(16);
        fs.readSync(fd, headerBuffer, 0, 16, 0);
        fs.closeSync(fd);

        if (!headerBuffer.equals(SQLITE_HEADER)) {
          throw new Error('Invalid file format. Uploaded file does not contain a valid SQLite 3 header.');
        }

        // Fast structural quick_check
        try {
          const testDb = new Database(tempUploadedPath, { readonly: true, timeout: 10000 });
          const check = testDb.pragma('quick_check(100)', { simple: true });
          testDb.close();

          if (check !== 'ok') {
            throw new Error(`Database integrity check failed: ${check}`);
          }
        } catch (testErr: any) {
          throw new Error(`Corrupt backup file: ${testErr.message}`);
        }

        // Step 3: Closing active connection
        sendStage({
          stage: 'closing',
          percent: 80,
          message: 'Releasing database connection locks...',
        });

        closeDatabase();

        // Step 4: Atomic database overwrite via SQLite cooperative online backup
        // This is 100% resilient on Windows when collector background processes have the database open
        sendStage({
          stage: 'replacing',
          percent: 85,
          message: 'Applying restored pages into active database...',
        });

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const tempDb = new Database(tempUploadedPath, { readonly: true, timeout: 30000 });
        tempDb.pragma('busy_timeout = 30000');

        await tempDb.backup(targetDbPath, {
          progress({ totalPages, remainingPages }) {
            const copiedPages = totalPages - remainingPages;
            const stepPercent = totalPages > 0 ? Math.round((copiedPages / totalPages) * 12) : 0;
            sendStage({
              stage: 'replacing',
              percent: 85 + stepPercent,
              message: `Applying database pages: ${copiedPages.toLocaleString()} / ${totalPages.toLocaleString()} pages...`,
            });
            return 2000;
          },
        });
        tempDb.close();

        // Step 5: Reconnecting and ensuring schema/indexes
        sendStage({
          stage: 'reopening',
          percent: 98,
          message: 'Reconnecting database, optimizing cache pragmas & indexing...',
        });

        const newDb = reopenDatabase();

        // Restore active user session so admin is never logged out
        if (currentSession && sessionToken) {
          try {
            newDb.prepare(`
              INSERT OR REPLACE INTO user_sessions (token, user_id, username, role, expires_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              sessionToken,
              currentSession.userId,
              currentSession.username,
              currentSession.role,
              currentSession.expiresAt,
              Date.now()
            );
          } catch (sessionErr) {
            console.warn('[Restore] Could not preserve session:', sessionErr);
          }
        }

        // Query restored table stats
        let rawLogsCount = 0;
        let summariesCount = 0;
        let mappingsCount = 0;
        let flowsCount = 0;

        try {
          const row = newDb.prepare('SELECT count(*) as count FROM raw_logs').get() as any;
          if (row) rawLogsCount = row.count;
        } catch {}

        try {
          const row = newDb.prepare('SELECT count(*) as count FROM daily_summaries').get() as any;
          if (row) summariesCount = row.count;
        } catch {}

        try {
          const row = newDb.prepare('SELECT count(*) as count FROM ip_mappings').get() as any;
          if (row) mappingsCount = row.count;
        } catch {}

        try {
          const row = newDb.prepare('SELECT count(*) as count FROM netflow_logs').get() as any;
          if (row) flowsCount = row.count;
        } catch {}

        // Remove the temporary old backup file now that restore succeeded
        if (oldBackupPath && fs.existsSync(oldBackupPath)) {
          try {
            fs.unlinkSync(oldBackupPath);
          } catch {}
        }

        // Step 6: Success completion
        sendStage({
          stage: 'completed',
          percent: 100,
          success: true,
          message: 'Database successfully restored from backup snapshot.',
          stats: {
            rawLogs: rawLogsCount,
            dailySummaries: summariesCount,
            ipMappings: mappingsCount,
            netflowLogs: flowsCount,
          },
          fileSizeBytes: stats.size,
        });
      } catch (err: any) {
        console.error('[Restore API] Error during database restoration:', err);

        // Attempt rollback if target was moved to oldBackupPath
        if (oldBackupPath && fs.existsSync(oldBackupPath) && !fs.existsSync(targetDbPath)) {
          try {
            fs.renameSync(oldBackupPath, targetDbPath);
          } catch {}
        }

        try {
          reopenDatabase();
        } catch {}

        sendStage({
          stage: 'error',
          percent: 0,
          success: false,
          error: err?.message || 'Database restoration failed',
        });
      } finally {
        if (fs.existsSync(tempUploadedPath)) {
          try {
            fs.unlinkSync(tempUploadedPath);
          } catch {}
        }
        if (!isClosed) {
          try {
            controller.close();
          } catch {}
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
