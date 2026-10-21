import path from 'path';
import fs from 'fs';
import { getDatabase } from './index';

export interface BackupProgressInfo {
  jobId: string;
  status: 'preparing' | 'ready' | 'error';
  totalPages: number;
  remainingPages: number;
  copiedPages: number;
  progressPercent: number;
  copiedBytes: number;
  totalEstimatedBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  error?: string | null;
  filename?: string;
  fileSizeBytes?: number;
  downloadUrl?: string;
  createdAt: number;
  completedAt?: number;
}

interface BackupJobInternal extends BackupProgressInfo {
  tempFilePath: string;
  finalFilePath: string;
  lastProgressUpdate: number;
  lastCopiedPages: number;
}

class BackupManager {
  private activeJob: BackupJobInternal | null = null;
  private readonly exportsDir: string;
  private readonly pageSize: number = 4096; // Standard SQLite page size

  constructor() {
    this.exportsDir = path.resolve(process.cwd(), 'backups', 'exports');
    this.ensureDir(this.exportsDir);
    this.cleanupOldExports();
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Delete exports older than 2 hours to conserve disk space
   */
  public cleanupOldExports(): void {
    try {
      this.ensureDir(this.exportsDir);
      const files = fs.readdirSync(this.exportsDir);
      const now = Date.now();
      const maxAgeMs = 2 * 60 * 60 * 1000; // 2 hours

      for (const file of files) {
        const fullPath = path.join(this.exportsDir, file);
        try {
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(fullPath);
          }
        } catch {}
      }
    } catch (e) {
      console.warn('[BackupManager] Error cleaning old exports:', e);
    }
  }

  /**
   * Get active job progress info
   */
  public getJob(jobId?: string): BackupProgressInfo | null {
    if (!this.activeJob) return null;
    if (jobId && this.activeJob.jobId !== jobId) {
      // Check if maybe it completed and the file exists
      return null;
    }

    const { tempFilePath, finalFilePath, lastProgressUpdate, lastCopiedPages, ...publicInfo } = this.activeJob;
    return publicInfo;
  }

  /**
   * Start a new backup preparation job
   */
  public async startBackupJob(): Promise<BackupProgressInfo> {
    // If a job is already actively preparing, return it
    if (this.activeJob && this.activeJob.status === 'preparing') {
      return this.getJob()!;
    }

    this.ensureDir(this.exportsDir);
    this.cleanupOldExports();

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jobId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = `squid_analytics_backup_${dateStr}.db`;
    const tempFilePath = path.join(this.exportsDir, `${jobId}.tmp`);
    const finalFilePath = path.join(this.exportsDir, `${jobId}_${filename}`);

    const job: BackupJobInternal = {
      jobId,
      status: 'preparing',
      totalPages: 0,
      remainingPages: 0,
      copiedPages: 0,
      progressPercent: 0,
      copiedBytes: 0,
      totalEstimatedBytes: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      tempFilePath,
      finalFilePath,
      filename,
      createdAt: Date.now(),
      lastProgressUpdate: Date.now(),
      lastCopiedPages: 0,
      downloadUrl: `/api/backup/download?jobId=${jobId}`,
    };

    this.activeJob = job;

    // Run the backup asynchronously so API returns immediately to start polling
    (async () => {
      try {
        const db = getDatabase();

        // Check SQLite page size
        let pageSize = this.pageSize;
        try {
          const pragmaPageSize = db.pragma('page_size', { simple: true }) as number;
          if (pragmaPageSize && typeof pragmaPageSize === 'number') {
            pageSize = pragmaPageSize;
          }
        } catch {}

        let lastTime = Date.now();
        let lastPagesCopied = 0;

        await db.backup(tempFilePath, {
          progress({ totalPages, remainingPages }) {
            const copiedPages = totalPages - remainingPages;
            const progressPercent = totalPages > 0 ? Math.min(99, Math.round((copiedPages / totalPages) * 100)) : 0;
            const copiedBytes = copiedPages * pageSize;
            const totalEstimatedBytes = totalPages * pageSize;

            const now = Date.now();
            const elapsedSinceLast = (now - lastTime) / 1000;

            let speed = job.speedBytesPerSec;
            let eta = job.etaSeconds;

            if (elapsedSinceLast >= 0.5) {
              const pagesDelta = copiedPages - lastPagesCopied;
              const bytesDelta = pagesDelta * pageSize;
              const currentSpeed = elapsedSinceLast > 0 ? bytesDelta / elapsedSinceLast : 0;
              speed = speed > 0 ? speed * 0.7 + currentSpeed * 0.3 : currentSpeed;

              const remainingBytes = remainingPages * pageSize;
              eta = speed > 0 ? Math.max(0, Math.round(remainingBytes / speed)) : 0;

              lastTime = now;
              lastPagesCopied = copiedPages;
            }

            job.totalPages = totalPages;
            job.remainingPages = remainingPages;
            job.copiedPages = copiedPages;
            job.progressPercent = progressPercent;
            job.copiedBytes = copiedBytes;
            job.totalEstimatedBytes = totalEstimatedBytes;
            job.speedBytesPerSec = Math.round(speed);
            job.etaSeconds = eta;
            job.lastProgressUpdate = now;

            // Return 1000 pages (~4MB per step) for fast copy with high-frequency progress
            return 1000;
          },
        });

        // Rename temp file to final file
        if (fs.existsSync(tempFilePath)) {
          fs.renameSync(tempFilePath, finalFilePath);
        }

        const stats = fs.statSync(finalFilePath);
        job.status = 'ready';
        job.progressPercent = 100;
        job.remainingPages = 0;
        job.copiedPages = job.totalPages;
        job.fileSizeBytes = stats.size;
        job.copiedBytes = stats.size;
        job.totalEstimatedBytes = stats.size;
        job.etaSeconds = 0;
        job.completedAt = Date.now();

        console.log(`[BackupManager] Backup completed successfully for job ${jobId}: ${filename} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
      } catch (err: any) {
        console.error(`[BackupManager] Backup failed for job ${jobId}:`, err);
        job.status = 'error';
        job.error = err?.message || 'Database snapshot creation failed';
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch {}
        }
      }
    })();

    const { tempFilePath: _, finalFilePath: __, lastProgressUpdate: ___, lastCopiedPages: ____, ...info } = job;
    return info;
  }

  /**
   * Find ready backup file path for downloading
   */
  public getDownloadFilePath(jobId: string): { filePath: string; filename: string; size: number } | null {
    if (this.activeJob && this.activeJob.jobId === jobId && this.activeJob.status === 'ready') {
      if (fs.existsSync(this.activeJob.finalFilePath)) {
        const stats = fs.statSync(this.activeJob.finalFilePath);
        return {
          filePath: this.activeJob.finalFilePath,
          filename: this.activeJob.filename || 'squid_analytics_backup.db',
          size: stats.size,
        };
      }
    }

    // Check directory for matching export file
    this.ensureDir(this.exportsDir);
    const files = fs.readdirSync(this.exportsDir);
    const matching = files.find((f) => f.startsWith(`${jobId}_`));
    if (matching) {
      const fullPath = path.join(this.exportsDir, matching);
      const filename = matching.substring(jobId.length + 1);
      const stats = fs.statSync(fullPath);
      return {
        filePath: fullPath,
        filename,
        size: stats.size,
      };
    }

    return null;
  }
}

// Singleton instance
const globalBackupManager = new BackupManager();
export function getBackupManager(): BackupManager {
  return globalBackupManager;
}
