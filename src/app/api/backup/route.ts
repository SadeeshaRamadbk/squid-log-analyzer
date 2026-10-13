import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDatabase } from '@/lib/db';

export async function GET() {
  const tempBackupPath = path.join(os.tmpdir(), `squid_backup_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);

  try {
    const db = getDatabase();

    // Use better-sqlite3 native online backup which safely consolidates WAL frames
    await db.backup(tempBackupPath);

    const fileBuffer = fs.readFileSync(tempBackupPath);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `squid_analytics_backup_${dateStr}.db`;

    // Clean up temporary file
    try {
      fs.unlinkSync(tempBackupPath);
    } catch {}

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
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
