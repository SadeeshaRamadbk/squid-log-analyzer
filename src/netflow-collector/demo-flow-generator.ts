import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { BatchFlowInserter } from './batch-flow-inserter';
import { resolveServiceName, resolveProtocolName } from './service-ports';
import type { DecodedNetFlow } from './netflow-v5-parser';

const INTERNAL_IPS = [
  '10.20.1.15',
  '10.20.1.42',
  '10.20.1.88',
  '10.20.2.10',
  '10.20.2.25',
  '10.20.2.104',
  '10.20.3.5',
  '10.20.3.18',
  '192.168.10.50',
  '192.168.10.75',
];

const EXTERNAL_DESTINATIONS = [
  { ip: '142.250.190.46', port: 443, protocolNum: 6, weight: 30 }, // Google HTTPS
  { ip: '52.216.144.18', port: 443, protocolNum: 6, weight: 20 },  // AWS HTTPS
  { ip: '13.107.42.16', port: 443, protocolNum: 6, weight: 15 },   // Microsoft 365 HTTPS
  { ip: '1.1.1.1', port: 53, protocolNum: 17, weight: 15 },         // Cloudflare DNS UDP
  { ip: '8.8.8.8', port: 53, protocolNum: 17, weight: 10 },         // Google DNS UDP
  { ip: '10.20.1.5', port: 445, protocolNum: 6, weight: 8 },       // Local SMB
  { ip: '10.20.1.6', port: 389, protocolNum: 6, weight: 6 },       // Local Active Directory LDAP
  { ip: '198.51.100.22', port: 5060, protocolNum: 17, weight: 5 },  // Corporate SIP VoIP
  { ip: '10.20.1.1', port: 123, protocolNum: 17, weight: 4 },      // Gateway NTP
  { ip: '203.0.113.10', port: 22, protocolNum: 6, weight: 3 },      // Remote Bastion SSH
  { ip: '10.20.2.1', port: 3389, protocolNum: 6, weight: 3 },      // Internal Windows RDP
  { ip: '1.1.1.1', port: 0, protocolNum: 1, weight: 2 },           // Ping ICMP
];

export function generateSyntheticFlows(daysCount = 14, sessionsPerDay = 180) {
  console.log(`[Demo Flow Generator] Generating bidirectional softflowd flows for ${daysCount} days (~${sessionsPerDay * 2} flows/day)...`);

  const inserter = new BatchFlowInserter(500, 1000);
  const now = Date.now();
  let totalGenerated = 0;

  for (let dayOffset = daysCount; dayOffset >= 0; dayOffset--) {
    const dayTimestamp = now - dayOffset * 24 * 60 * 60 * 1000;

    for (let i = 0; i < sessionsPerDay; i++) {
      const recordTime = dayTimestamp + Math.floor(Math.random() * 86400000);
      if (recordTime > now) continue;

      const clientIp = INTERNAL_IPS[Math.floor(Math.random() * INTERNAL_IPS.length)];
      const clientPort = Math.floor(Math.random() * 40000) + 10240;

      // Pick destination based on weight
      const totalWeight = EXTERNAL_DESTINATIONS.reduce((acc, d) => acc + d.weight, 0);
      let rand = Math.random() * totalWeight;
      let dest = EXTERNAL_DESTINATIONS[0];
      for (const d of EXTERNAL_DESTINATIONS) {
        if (rand < d.weight) {
          dest = d;
          break;
        }
        rand -= d.weight;
      }

      const protocol = resolveProtocolName(dest.protocolNum);
      const serviceName = dest.protocolNum === 1 ? 'ICMP Echo' : resolveServiceName(dest.port);

      // 1. Outbound / Upload Flow (Client -> Server)
      const ulPackets = Math.floor(Math.random() * 12) + 2;
      const ulBytes = ulPackets * (Math.floor(Math.random() * 180) + 54);
      const ulFlags = dest.protocolNum === 6 ? 'SYN,ACK,PSH' : '-';
      const durationMs = Math.floor(Math.random() * 8000) + 30;

      const uploadFlow: DecodedNetFlow = {
        timestamp: recordTime,
        srcIp: clientIp,
        dstIp: dest.ip,
        srcPort: clientPort,
        dstPort: dest.port,
        protocol,
        serviceName,
        bytes: ulBytes,
        packets: ulPackets,
        tcpFlags: ulFlags,
        flowDurationMs: durationMs,
      };
      inserter.push(uploadFlow);
      totalGenerated++;

      // 2. Inbound / Download Flow (Server -> Client)
      // Download bytes are realistically 4x to 25x larger than upload
      const dlPackets = Math.floor(Math.random() * 80) + 5;
      const dlBytes = dlPackets * (Math.floor(Math.random() * 1350) + 150);
      const dlFlags = dest.protocolNum === 6 ? 'SYN,ACK,PSH,FIN' : '-';

      const downloadFlow: DecodedNetFlow = {
        timestamp: recordTime + Math.min(durationMs, 100),
        srcIp: dest.ip,
        dstIp: clientIp,
        srcPort: dest.port,
        dstPort: clientPort,
        protocol,
        serviceName,
        bytes: dlBytes,
        packets: dlPackets,
        tcpFlags: dlFlags,
        flowDurationMs: durationMs,
      };
      inserter.push(downloadFlow);
      totalGenerated++;
    }
  }

  // Also generate immediate recent flows in the last 20 minutes for live real-time testing
  for (let i = 0; i < 75; i++) {
    const recordTime = now - Math.floor(Math.random() * 20 * 60 * 1000);
    const clientIp = INTERNAL_IPS[Math.floor(Math.random() * INTERNAL_IPS.length)];
    const clientPort = Math.floor(Math.random() * 40000) + 10240;

    const dest = EXTERNAL_DESTINATIONS[Math.floor(Math.random() * EXTERNAL_DESTINATIONS.length)];
    const protocol = resolveProtocolName(dest.protocolNum);
    const serviceName = dest.protocolNum === 1 ? 'ICMP Echo' : resolveServiceName(dest.port);

    const ulPackets = Math.floor(Math.random() * 10) + 2;
    const ulBytes = ulPackets * (Math.floor(Math.random() * 150) + 60);
    const dlPackets = Math.floor(Math.random() * 70) + 8;
    const dlBytes = dlPackets * (Math.floor(Math.random() * 1200) + 200);

    // Upload
    inserter.push({
      timestamp: recordTime,
      srcIp: clientIp,
      dstIp: dest.ip,
      srcPort: clientPort,
      dstPort: dest.port,
      protocol,
      serviceName,
      bytes: ulBytes,
      packets: ulPackets,
      tcpFlags: dest.protocolNum === 6 ? 'SYN,ACK,PSH' : '-',
      flowDurationMs: 450,
    });
    totalGenerated++;

    // Download
    inserter.push({
      timestamp: recordTime + 50,
      srcIp: dest.ip,
      dstIp: clientIp,
      srcPort: dest.port,
      dstPort: clientPort,
      protocol,
      serviceName,
      bytes: dlBytes,
      packets: dlPackets,
      tcpFlags: dest.protocolNum === 6 ? 'SYN,ACK,PSH,FIN' : '-',
      flowDurationMs: 450,
    });
    totalGenerated++;
  }

  inserter.flush();
  inserter.close();
  console.log(`[Demo Flow Generator] Completed successfully! Ingested ${totalGenerated} bidirectional flows into SQLite.`);
}

if (require.main === module) {
  generateSyntheticFlows();
}
