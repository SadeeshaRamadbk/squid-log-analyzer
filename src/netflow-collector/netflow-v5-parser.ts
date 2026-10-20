import { resolveProtocolName, classifyService } from './service-ports';

export interface DecodedNetFlow {
  timestamp: number;          // Epoch ms
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  protocol: string;           // 'TCP', 'UDP', 'ICMP', etc.
  serviceName: string;        // 'HTTPS', 'DNS', etc.
  bytes: number;
  packets: number;
  tcpFlags: string;           // 'SYN,ACK', etc.
  flowDurationMs: number;
}

function uint32ToIp(val: number): string {
  return `${(val >>> 24) & 255}.${(val >>> 16) & 255}.${(val >>> 8) & 255}.${val & 255}`;
}

function decodeTcpFlags(flagsByte: number): string {
  const flags: string[] = [];
  if (flagsByte & 0x02) flags.push('SYN');
  if (flagsByte & 0x10) flags.push('ACK');
  if (flagsByte & 0x01) flags.push('FIN');
  if (flagsByte & 0x04) flags.push('RST');
  if (flagsByte & 0x08) flags.push('PSH');
  if (flagsByte & 0x20) flags.push('URG');
  return flags.join(',') || '-';
}

/**
 * Parses a NetFlow v5 UDP payload sent by softflowd on pfSense
 */
export function parseNetFlowV5Packet(buffer: Buffer): DecodedNetFlow[] {
  // Minimum header size: 24 bytes
  if (buffer.length < 24) {
    return [];
  }

  const version = buffer.readUInt16BE(0);
  if (version !== 5) {
    // NetFlow version mismatch (e.g. v9 or other)
    return [];
  }

  const count = buffer.readUInt16BE(2);
  // sysUptime at offset 4..8 (not needed for absolute timestamps)
  const unixSecs = buffer.readUInt32BE(8);
  const unixNsecs = buffer.readUInt32BE(12);

  const baseTimestampMs = unixSecs * 1000 + Math.floor(unixNsecs / 1000000);

  const flows: DecodedNetFlow[] = [];
  const RECORD_SIZE = 48;

  for (let i = 0; i < count; i++) {
    const offset = 24 + i * RECORD_SIZE;
    if (offset + RECORD_SIZE > buffer.length) {
      break;
    }

    const srcIpNum = buffer.readUInt32BE(offset + 0);
    const dstIpNum = buffer.readUInt32BE(offset + 4);
    const dPkts = buffer.readUInt32BE(offset + 16);
    const dOctets = buffer.readUInt32BE(offset + 20);
    const firstUptime = buffer.readUInt32BE(offset + 24);
    const lastUptime = buffer.readUInt32BE(offset + 28);
    const srcPort = buffer.readUInt16BE(offset + 32);
    const dstPort = buffer.readUInt16BE(offset + 34);
    const flagsByte = buffer.readUInt8(offset + 37);
    const protoNum = buffer.readUInt8(offset + 38);

    const srcIp = uint32ToIp(srcIpNum);
    const dstIp = uint32ToIp(dstIpNum);
    const protocol = resolveProtocolName(protoNum);
    const { serviceName } = classifyService(srcPort, dstPort);
    const tcpFlags = protocol === 'TCP' ? decodeTcpFlags(flagsByte) : '-';

    const flowDurationMs = Math.max(0, lastUptime - firstUptime);

    // Flow timestamp relative to packet time
    const flowTimestamp = baseTimestampMs > 0 ? baseTimestampMs : Date.now();

    flows.push({
      timestamp: flowTimestamp,
      srcIp,
      dstIp,
      srcPort,
      dstPort,
      protocol,
      serviceName,
      bytes: dOctets,
      packets: dPkts,
      tcpFlags,
      flowDurationMs,
    });
  }

  return flows;
}
