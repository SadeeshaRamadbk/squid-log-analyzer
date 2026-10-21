import path from 'path';
import fs from 'fs';
import cp from 'child_process';
import { getDatabase, getDatabasePath } from './index';

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
  childProcess?: cp.ChildProcess | null;
  pollInterval?: NodeJS.Timeout | null;
}

class BackupManager {
  private activeJob: BackupJobInternal | null = null;
  private readonly exportsDir: string;
  private readonly defaultPageSize: number = 4096;

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
      return null;
    }

    const { tempFilePath, finalFilePath, childProcess, pollInterval, ...publicInfo } = this.activeJob;
    return publicInfo;
  }

  /**
   * Start a new backup preparation job using an isolated point-in-time VACUUM snapshot
   * This guarantees that ongoing background writes from log ingestion / NetFlow collectors
   * will NOT trigger SQLite backup resets or infinite loops.
   */
  public async startBackupJob(): Promise<BackupProgressInfo> {
    // If a job is already actively preparing, return it
    if (this.activeJob && this.activeJob.status === 'preparing') {
      return this.getJob()!;
    }

    // Clean up any stale job child process
    if (this.activeJob && this.activeJob.childProcess) {
      try {
        this.activeJob.childProcess.kill();
      } catch {}
    }
    if (this.activeJob && this.activeJob.pollInterval) {
      clearInterval(this.activeJob.pollInterval);
    }

    this.ensureDir(this.exportsDir);
    this.cleanupOldExports();

    const sourceDbPath = getDatabasePath();
    const db = getDatabase();

    // Check page size and total page count for progress calculations
    let pageSize = this.defaultPageSize;
    let pageCount = 0;
    try {
      const pSize = db.pragma('page_size', { simple: true }) as number;
      if (pSize && typeof pSize === 'number') pageSize = pSize;
      const pCount = db.pragma('page_count', { simple: true }) as number;
      if (pCount && typeof pCount === 'number') pageCount = pCount;
    } catch {}

    const sourceStats = fs.existsSync(sourceDbPath) ? fs.statSync(sourceDbPath) : null;
    const totalEstimatedBytes = sourceStats ? sourceStats.size : pageCount * pageSize;
    const totalPages = pageCount > 0 ? pageCount : Math.max(1, Math.ceil(totalEstimatedBytes / pageSize));

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const jobId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = `squid_analytics_backup_${dateStr}.db`;
    const tempFilePath = path.join(this.exportsDir, `${jobId}.tmp`);
    const finalFilePath = path.join(this.exportsDir, `${jobId}_${filename}`);

    const job: BackupJobInternal = {
      jobId,
      status: 'preparing',
      totalPages,
      remainingPages: totalPages,
      copiedPages: 0,
      progressPercent: 0,
      copiedBytes: 0,
      totalEstimatedBytes,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      tempFilePath,
      finalFilePath,
      filename,
      createdAt: Date.now(),
      downloadUrl: `/api/backup/download?jobId=${jobId}`,
      childProcess: null,
      pollInterval: null,
    };

    this.activeJob = job;

    let workerScript = path.resolve(process.cwd(), 'src', 'lib', 'db', 'vacuum-worker.js');
    if (!fs.existsSync(workerScript)) {
      workerScript = path.resolve(__dirname, 'vacuum-worker.js');
    }

    try {
      const child = cp.spawn(process.execPath, [workerScript, sourceDbPath, tempFilePath], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      job.childProcess = child;

      let lastTime = Date.now();
      let lastBytesCopied = 0;

      // Monitor growing destination snapshot file size
      job.pollInterval = setInterval(() => {
        try {
          if (!fs.existsSync(tempFilePath)) return;

          const stats = fs.statSync(tempFilePath);
          const copiedBytes = stats.size;
          const copiedPages = Math.min(totalPages, Math.ceil(copiedBytes / pageSize));
          const remainingPages = Math.max(0, totalPages - copiedPages);

          const now = Date.now();
          const elapsedSec = (now - lastTime) / 1000;

          if (elapsedSec >= 0.3) {
            const bytesDelta = copiedBytes - lastBytesCopied;
            const currentSpeed = elapsedSec > 0 ? bytesDelta / elapsedSec : 0;
            const smoothSpeed = job.speedBytesPerSec > 0 ? job.speedBytesPerSec * 0.7 + currentSpeed * 0.3 : currentSpeed;

            const remainingBytes = Math.max(0, totalEstimatedBytes - copiedBytes);
            const eta = smoothSpeed > 0 ? Math.max(0, Math.round(remainingBytes / smoothSpeed)) : 0;

            job.speedBytesPerSec = Math.round(smoothSpeed);
            job.etaSeconds = eta;
            lastTime = now;
            lastBytesCopied = copiedBytes;
          }

          const percent = totalEstimatedBytes > 0
            ? Math.min(99, Math.round((copiedBytes / totalEstimatedBytes) * 100))
            : Math.min(99, Math.round((copiedPages / totalPages) * 100));

          job.copiedBytes = copiedBytes;
          job.copiedPages = copiedPages;
          job.remainingPages = remainingPages;
          job.progressPercent = Math.max(job.progressPercent, percent);
        } catch {}
      }, 250);

      child.on('message', (msg: any) => {
        if (msg && msg.success) {
          if (job.pollInterval) clearInterval(job.pollInterval);

          try {
            if (fs.existsSync(tempFilePath)) {
              fs.renameSync(tempFilePath, finalFilePath);
            }
            const finalStats = fs.statSync(finalFilePath);
            job.status = 'ready';
            job.progressPercent = 100;
            job.remainingPages = 0;
            job.copiedPages = job.totalPages;
            job.fileSizeBytes = finalStats.size;
            job.copiedBytes = finalStats.size;
            job.totalEstimatedBytes = finalStats.size;
            job.etaSeconds = 0;
            job.completedAt = Date.now();

            console.log(
              `[BackupManager] Backup completed successfully for job ${jobId}: ${filename} (${(finalStats.size / (1024 * 1024)).toFixed(1)} MB)`
            );
          } catch (finErr: any) {
            job.status = 'error';
            job.error = finErr.message || 'Error finalizing backup file';
          }
        } else if (msg && msg.error) {
          if (job.pollInterval) clearInterval(job.pollInterval);
          job.status = 'error';
          job.error = msg.error;
          if (fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch {}
          }
        }
      });

      child.on('error', (err) => {
        if (job.pollInterval) clearInterval(job.pollInterval);
        console.error(`[BackupManager] Worker error for job ${jobId}:`, err);
        job.status = 'error';
        job.error = err.message || 'Worker process failed';
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch {}
        }
      });

      child.on('exit', (code) => {
        if (job.pollInterval) clearInterval(job.pollInterval);
        if (code !== 0 && job.status === 'preparing') {
          job.status = 'error';
          job.error = `Worker process exited unexpectedly with code ${code}`;
          if (fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch {}
          }
        }
      });
    } catch (err: any) {
      console.error(`[BackupManager] Failed to launch worker for job ${jobId}:`, err);
      job.status = 'error';
      job.error = err.message || 'Failed to start backup worker process';
    }

    const { tempFilePath: _, finalFilePath: __, childProcess: ___, pollInterval: ____, ...info } = job;
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
