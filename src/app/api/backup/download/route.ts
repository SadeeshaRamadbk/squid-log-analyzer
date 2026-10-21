import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable } from 'stream';
import { getUserFromRequest } from '@/lib/auth';
import { getBackupManager } from '@/lib/db/backup-manager';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (user && user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin role required to download database backups' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }

  const manager = getBackupManager();
  const fileInfo = manager.getDownloadFilePath(jobId);

  if (!fileInfo || !fs.existsSync(fileInfo.filePath)) {
    return NextResponse.json(
      { success: false, error: 'Backup file not found or preparation is still incomplete' },
      { status: 404 }
    );
  }

  try {
    // 1MB stream chunking to eliminate Node.js heap memory consumption
    const nodeStream = fs.createReadStream(fileInfo.filePath, { highWaterMark: 1024 * 1024 });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
        'Content-Length': fileInfo.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Error streaming backup file:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to stream backup file' },
      { status: 500 }
    );
  }
}
