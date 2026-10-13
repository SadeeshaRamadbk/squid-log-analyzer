import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { getDatabasePath, closeDatabase, reopenDatabase } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'utf-8');

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (user && user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin role required to restore database backups' },
      { status: 403 }
    );
  }

  const tempUploadedPath = path.join(
    os.tmpdir(),
    `squid_restore_${Date.now()}_${Math.random().toString(36).substring(7)}.db`
  );

  try {
    const formData = await request.formData();
    const file = formData.get('backupFile') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No backup file provided in upload' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate minimum file size and SQLite header
    if (buffer.length < 100) {
      return NextResponse.json(
        { success: false, error: 'The uploaded file is too small to be a valid SQLite database' },
        { status: 400 }
      );
    }

    const header = buffer.subarray(0, 16);
    if (!header.equals(SQLITE_HEADER)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file format. The uploaded file does not contain a valid SQLite database header.',
        },
        { status: 400 }
      );
    }

    // Save uploaded file to temp path to verify integrity before replacing live DB
    fs.writeFileSync(tempUploadedPath, buffer);

    // Verify database opens and passes basic integrity check
    try {
      const testDb = new Database(tempUploadedPath, { readonly: true });
      const check = testDb.pragma('integrity_check', { simple: true });
      testDb.close();

      if (check !== 'ok') {
        throw new Error(`Database integrity check failed: ${check}`);
      }
    } catch (testErr: any) {
      return NextResponse.json(
        { success: false, error: `Corrupt backup file: ${testErr.message}` },
        { status: 400 }
      );
    }

    // Safely close active connection
    closeDatabase();

    const targetDbPath = getDatabasePath();
    const walPath = `${targetDbPath}-wal`;
    const shmPath = `${targetDbPath}-shm`;

    // Ensure target directory exists
    const dbDir = path.dirname(targetDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Remove obsolete WAL and SHM files to prevent schema mismatch
    if (fs.existsSync(walPath)) {
      try {
        fs.unlinkSync(walPath);
      } catch {}
    }
    if (fs.existsSync(shmPath)) {
      try {
        fs.unlinkSync(shmPath);
      } catch {}
    }

    // Copy validated database file into target path
    fs.copyFileSync(tempUploadedPath, targetDbPath);

    // Reopen database connection and ensure schema
    const newDb = reopenDatabase();
    const rawCount = newDb.prepare('SELECT count(*) as count FROM raw_logs').get() as any;
    const summaryCount = newDb.prepare('SELECT count(*) as count FROM daily_summaries').get() as any;
    const mappingCount = newDb.prepare('SELECT count(*) as count FROM ip_mappings').get() as any;

    return NextResponse.json({
      success: true,
      message: 'Database successfully restored from backup file.',
      stats: {
        rawLogs: rawCount?.count || 0,
        dailySummaries: summaryCount?.count || 0,
        ipMappings: mappingCount?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    // Ensure database is reopened in case of failure
    try {
      reopenDatabase();
    } catch {}
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to restore database from backup' },
      { status: 500 }
    );
  } finally {
    if (fs.existsSync(tempUploadedPath)) {
      try {
        fs.unlinkSync(tempUploadedPath);
      } catch {}
    }
  }
}
