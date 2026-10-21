import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getBackupManager } from '@/lib/db/backup-manager';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (user && user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin role required to check backup status' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId') || undefined;

  const manager = getBackupManager();
  const job = manager.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'No active backup preparation job found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    job,
  });
}
