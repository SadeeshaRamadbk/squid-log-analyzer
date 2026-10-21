import { EventEmitter } from 'events';
import { getDatabase } from '@/lib/db';
import type { ParsedSyslogEvent } from './syslog-parser';

export class BatchSyslogInserter extends EventEmitter {
  private queue: ParsedSyslogEvent[] = [];
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private totalIngested = 0;

  constructor(batchSize = 200, flushIntervalMs = 1000) {
    super();
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.startTimer();
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.queue.length > 0 && !this.isFlushing) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Push a parsed event to the in-memory batch buffer
   */
  public push(event: ParsedSyslogEvent): void {
    this.queue.push(event);

    // Broadcast immediately to live SSE subscribers
    this.emit('event', event);

    if (this.queue.length >= this.batchSize && !this.isFlushing) {
      this.flush();
    }
  }

  /**
   * Flush buffered events in an atomic SQLite transaction
   */
  public flush(): number {
    if (this.queue.length === 0 || this.isFlushing) return 0;
    this.isFlushing = true;

    const items = this.queue.splice(0, this.queue.length);
    const count = items.length;

    try {
      const db = getDatabase();
      const insertStmt = db.prepare(`
        INSERT INTO syslog_events (
          timestamp, facility, facility_label, severity, severity_label,
          hostname, app_name, proc_id, message, raw_message,
          action, interface, direction, protocol, src_ip, dst_ip, src_port, dst_port, tcp_flags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((records: ParsedSyslogEvent[]) => {
        for (const item of records) {
          insertStmt.run(
            item.timestamp,
            item.facility,
            item.facility_label,
            item.severity,
            item.severity_label,
            item.hostname,
            item.app_name,
            item.proc_id || null,
            item.message,
            item.raw_message,
            item.action || null,
            item.interface || null,
            item.direction || null,
            item.protocol || null,
            item.src_ip || null,
            item.dst_ip || null,
            item.src_port || null,
            item.dst_port || null,
            item.tcp_flags || null
          );
        }
      });

      insertMany(items);
      this.totalIngested += count;
    } catch (err) {
      console.error('[BatchSyslogInserter] Failed to flush syslog batch:', err);
      // Re-queue items at the front to avoid data loss
      this.queue.unshift(...items);
    } finally {
      this.isFlushing = false;
    }

    return count;
  }

  public getTotalIngested(): number {
    return this.totalIngested;
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

// Global singleton instance for shared collector & SSE stream access
let globalSyslogInserter: BatchSyslogInserter | null = null;
export function getSyslogInserter(): BatchSyslogInserter {
  if (!globalSyslogInserter) {
    globalSyslogInserter = new BatchSyslogInserter();
  }
  return globalSyslogInserter;
}
