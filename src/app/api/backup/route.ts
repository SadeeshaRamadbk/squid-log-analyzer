import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { getDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (user && user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin role required to export database backups' },
      { status: 403 }
    );
  }

  const tempBackupPath = path.join(os.tmpdir(), `squid_backup_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);

  try {
    const db = getDatabase();

    // Use better-sqlite3 native online backup which safely consolidates WAL frames
    // Use 1000 page steps for faster backup execution
    await db.backup(tempBackupPath, {
      progress() {
        return 1000;
      },
    });

    const stats = fs.statSync(tempBackupPath);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `squid_analytics_backup_${dateStr}.db`;

    // Stream file chunk-by-chunk directly to HTTP response without loading entire file in RAM
    const nodeStream = fs.createReadStream(tempBackupPath, { highWaterMark: 1024 * 1024 });

    // Clean up temporary file when streaming finishes or errors
    nodeStream.on('close', () => {
      try {
        if (fs.existsSync(tempBackupPath)) {
          fs.unlinkSync(tempBackupPath);
        }
      } catch {}
    });

    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    if (fs.existsSync(tempBackupPath)) {
      try {
        fs.unlinkSync(tempBackupPath);
      } catch {}
    }
    console.error('Backup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create database backup' },
      { status: 500 }
    );
  }
}
