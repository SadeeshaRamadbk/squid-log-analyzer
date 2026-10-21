import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getBackupManager } from '@/lib/db/backup-manager';

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (user && user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin role required to export database backups' },
      { status: 403 }
    );
  }

  try {
    const manager = getBackupManager();
    const jobInfo = await manager.startBackupJob();

    return NextResponse.json({
      success: true,
      job: jobInfo,
    });
  } catch (error: any) {
    console.error('API /api/backup/prepare error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to start backup preparation' },
      { status: 500 }
    );
  }
}
