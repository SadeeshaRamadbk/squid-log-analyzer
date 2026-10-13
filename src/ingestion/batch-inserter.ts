import { getDatabase } from '../lib/db';
import type { ParsedSquidLog } from './log-parser';

export class BatchInserter {
  private buffer: ParsedSquidLog[] = [];
  private batchSize: number;
  private flushIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private totalIngested = 0;
  private totalBlocked = 0;

  constructor(batchSize = 500, flushIntervalMs = 2000) {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.startTimer();
  }

  private startTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Queue a parsed log item
   */
  public push(item: ParsedSquidLog): void {
    this.buffer.push(item);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Push multiple parsed items
   */
  public pushBatch(items: ParsedSquidLog[]): void {
    this.buffer.push(...items);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued buffer into SQLite within a single transaction
   */
  public flush(): number {
    if (this.buffer.length === 0) {
      return 0;
    }

    const itemsToInsert = this.buffer;
    this.buffer = [];

    const db = getDatabase();

    // Prepare statements
    const insertRawStmt = db.prepare(`
      INSERT INTO raw_logs (
        timestamp, client_ip, method, url, domain, result_code, is_blocked, bytes
      ) VALUES (
        @timestamp, @client_ip, @method, @url, @domain, @result_code, @is_blocked, @bytes
      )
    `);

    const upsertSummaryStmt = db.prepare(`
      INSERT INTO daily_summaries (
        date, client_ip, domain, request_count, blocked_count, bytes
      ) VALUES (
        @date, @client_ip, @domain, @request_count, @blocked_count, @bytes
      )
      ON CONFLICT(date, client_ip, domain) DO UPDATE SET
        request_count = request_count + excluded.request_count,
        blocked_count = blocked_count + excluded.blocked_count,
        bytes = bytes + excluded.bytes
    `);

    // Aggregate summary increments within the batch in memory first
    const summaryAggregates = new Map<string, {
      date: string;
      client_ip: string;
      domain: string;
      request_count: number;
      blocked_count: number;
      bytes: number;
    }>();

    for (const item of itemsToInsert) {
      const key = `${item.date}__${item.clientIp}__${item.domain}`;
      const existing = summaryAggregates.get(key);
      if (existing) {
        existing.request_count += 1;
        existing.blocked_count += item.isBlocked ? 1 : 0;
        existing.bytes += item.bytes;
      } else {
        summaryAggregates.set(key, {
          date: item.date,
          client_ip: item.clientIp,
          domain: item.domain,
          request_count: 1,
          blocked_count: item.isBlocked ? 1 : 0,
          bytes: item.bytes,
        });
      }
    }

    // Execute atomic transaction
    const executeBatch = db.transaction((logs: ParsedSquidLog[]) => {
      // 1. Insert raw logs
      for (const item of logs) {
        insertRawStmt.run({
          timestamp: item.timestamp,
          client_ip: item.clientIp,
          method: item.method,
          url: item.url, // NULL for allowed; full URL for blocked
          domain: item.domain,
          result_code: item.resultCode,
          is_blocked: item.isBlocked ? 1 : 0,
          bytes: item.bytes,
        });
      }

      // 2. Upsert daily summaries
      for (const summary of summaryAggregates.values()) {
        upsertSummaryStmt.run(summary);
      }
    });

    try {
      executeBatch(itemsToInsert);
      this.totalIngested += itemsToInsert.length;
      const blockedInBatch = itemsToInsert.filter((i) => i.isBlocked).length;
      this.totalBlocked += blockedInBatch;

      console.log(
        `[Batch Inserter] Committed ${itemsToInsert.length} logs (${blockedInBatch} blocked). Total ingested: ${this.totalIngested}`
      );
      return itemsToInsert.length;
    } catch (error) {
      console.error('[Batch Inserter] Error committing transaction batch:', error);
      // Re-queue items that failed
      this.buffer.unshift(...itemsToInsert);
      throw error;
    }
  }

  public getStats() {
    return {
      totalIngested: this.totalIngested,
      totalBlocked: this.totalBlocked,
      pendingBuffer: this.buffer.length,
    };
  }

  public close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}
