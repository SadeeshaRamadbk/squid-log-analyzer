import { getDatabase } from '../lib/db';
import type { DecodedNetFlow } from './netflow-v5-parser';

export class BatchFlowInserter {
  private buffer: DecodedNetFlow[] = [];
  private batchSize: number;
  private flushIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private totalIngested = 0;

  constructor(batchSize = 500, flushIntervalMs = 2000) {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.startTimer();
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  public push(flow: DecodedNetFlow): void {
    this.buffer.push(flow);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  public pushBatch(flows: DecodedNetFlow[]): void {
    this.buffer.push(...flows);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  public flush(): number {
    if (this.buffer.length === 0) return 0;

    const flowsToInsert = this.buffer;
    this.buffer = [];

    const db = getDatabase();

    const insertRawStmt = db.prepare(`
      INSERT INTO netflow_logs (
        timestamp, src_ip, dst_ip, src_port, dst_port, protocol, service_name, bytes, packets, tcp_flags, flow_duration_ms
      ) VALUES (
        @timestamp, @src_ip, @dst_ip, @src_port, @dst_port, @protocol, @service_name, @bytes, @packets, @tcp_flags, @flow_duration_ms
      )
    `);

    const upsertSummaryStmt = db.prepare(`
      INSERT INTO netflow_daily_summaries (
        date, src_ip, dst_ip, dst_port, protocol, service_name, flow_count, bytes, packets
      ) VALUES (
        @date, @src_ip, @dst_ip, @dst_port, @protocol, @service_name, @flow_count, @bytes, @packets
      )
      ON CONFLICT(date, src_ip, dst_ip, dst_port, protocol) DO UPDATE SET
        flow_count = flow_count + excluded.flow_count,
        bytes = bytes + excluded.bytes,
        packets = packets + excluded.packets
    `);

    // Aggregate in-memory
    const aggregates = new Map<string, {
      date: string;
      src_ip: string;
      dst_ip: string;
      dst_port: number;
      protocol: string;
      service_name: string;
      flow_count: number;
      bytes: number;
      packets: number;
    }>();

    for (const flow of flowsToInsert) {
      const date = new Date(flow.timestamp).toISOString().split('T')[0];
      const key = `${date}__${flow.srcIp}__${flow.dstIp}__${flow.dstPort}__${flow.protocol}`;
      const existing = aggregates.get(key);
      if (existing) {
        existing.flow_count += 1;
        existing.bytes += flow.bytes;
        existing.packets += flow.packets;
      } else {
        aggregates.set(key, {
          date,
          src_ip: flow.srcIp,
          dst_ip: flow.dstIp,
          dst_port: flow.dstPort,
          protocol: flow.protocol,
          service_name: flow.serviceName,
          flow_count: 1,
          bytes: flow.bytes,
          packets: flow.packets,
        });
      }
    }

    const executeBatch = db.transaction((flows: DecodedNetFlow[]) => {
      for (const flow of flows) {
        insertRawStmt.run({
          timestamp: flow.timestamp,
          src_ip: flow.srcIp,
          dst_ip: flow.dstIp,
          src_port: flow.srcPort,
          dst_port: flow.dstPort,
          protocol: flow.protocol,
          service_name: flow.serviceName,
          bytes: flow.bytes,
          packets: flow.packets,
          tcp_flags: flow.tcpFlags,
          flow_duration_ms: flow.flowDurationMs,
        });
      }

      for (const agg of aggregates.values()) {
        upsertSummaryStmt.run(agg);
      }
    });

    try {
      executeBatch(flowsToInsert);
      this.totalIngested += flowsToInsert.length;
      console.log(`[NetFlow Collector] Committed ${flowsToInsert.length} flows. Total flows: ${this.totalIngested}`);
      return flowsToInsert.length;
    } catch (err) {
      console.error('[NetFlow Collector] Batch insert error:', err);
      this.buffer.unshift(...flowsToInsert);
      throw err;
    }
  }

  public close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}
