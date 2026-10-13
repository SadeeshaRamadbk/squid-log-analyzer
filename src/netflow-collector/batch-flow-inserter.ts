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

    const upsertMinuteStmt = db.prepare(`
      INSERT INTO netflow_minute_rollups (
        bucket_timestamp, src_ip, dst_ip, dst_port, protocol, service_name, flow_count, bytes, packets
      ) VALUES (
        @bucket_timestamp, @src_ip, @dst_ip, @dst_port, @protocol, @service_name, @flow_count, @bytes, @packets
      )
      ON CONFLICT(bucket_timestamp, src_ip, dst_ip, dst_port, protocol) DO UPDATE SET
        flow_count = flow_count + excluded.flow_count,
        bytes = bytes + excluded.bytes,
        packets = packets + excluded.packets
    `);

    const upsertHourlyStmt = db.prepare(`
      INSERT INTO netflow_hourly_rollups (
        bucket_timestamp, src_ip, dst_ip, dst_port, protocol, service_name, flow_count, bytes, packets
      ) VALUES (
        @bucket_timestamp, @src_ip, @dst_ip, @dst_port, @protocol, @service_name, @flow_count, @bytes, @packets
      )
      ON CONFLICT(bucket_timestamp, src_ip, dst_ip, dst_port, protocol) DO UPDATE SET
        flow_count = flow_count + excluded.flow_count,
        bytes = bytes + excluded.bytes,
        packets = packets + excluded.packets
    `);

    // Aggregate in-memory
    const aggregates = new Map<string, any>();
    const minuteAggregates = new Map<string, any>();
    const hourlyAggregates = new Map<string, any>();

    for (const flow of flowsToInsert) {
      const date = new Date(flow.timestamp).toISOString().split('T')[0];
      const minBucket = Math.floor(flow.timestamp / 60000) * 60000;
      const hrBucket = Math.floor(flow.timestamp / 3600000) * 3600000;

      // 1. Daily
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

      // 2. Minute Roll-up
      const minKey = `${minBucket}__${flow.srcIp}__${flow.dstIp}__${flow.dstPort}__${flow.protocol}`;
      const existingMin = minuteAggregates.get(minKey);
      if (existingMin) {
        existingMin.flow_count += 1;
        existingMin.bytes += flow.bytes;
        existingMin.packets += flow.packets;
      } else {
        minuteAggregates.set(minKey, {
          bucket_timestamp: minBucket,
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

      // 3. Hourly Roll-up
      const hrKey = `${hrBucket}__${flow.srcIp}__${flow.dstIp}__${flow.dstPort}__${flow.protocol}`;
      const existingHr = hourlyAggregates.get(hrKey);
      if (existingHr) {
        existingHr.flow_count += 1;
        existingHr.bytes += flow.bytes;
        existingHr.packets += flow.packets;
      } else {
        hourlyAggregates.set(hrKey, {
          bucket_timestamp: hrBucket,
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
      for (const agg of minuteAggregates.values()) {
        upsertMinuteStmt.run(agg);
      }
      for (const agg of hourlyAggregates.values()) {
        upsertHourlyStmt.run(agg);
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
