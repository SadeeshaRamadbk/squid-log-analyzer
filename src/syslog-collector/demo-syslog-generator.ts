import { parseSyslogMessage } from './syslog-parser';
import { getSyslogInserter } from './batch-syslog-inserter';

const SAMPLE_EVENTS = [
  // Squid Proxy Events
  '<27>Oct 21 13:10:02 pfsense.nipponbpo.local squid[2345]: 2026/10/21 13:10:02| WARNING: Disk cache capacity at 94% on /var/squid/cache',
  '<26>Oct 21 13:10:15 pfsense.nipponbpo.local squid[2345]: 2026/10/21 13:10:15| ERROR: DNS server 1.1.1.1:53 query timeout for domain analytics.internal.local',
  '<28>Oct 21 13:11:00 pfsense.nipponbpo.local squid[2345]: 2026/10/21 13:11:00| SECURITY: SSL Bump untrusted certificate rejected for upstream host malicious-tracker.net',
  '<30>Oct 21 13:11:45 pfsense.nipponbpo.local squid[2345]: 2026/10/21 13:11:45| INFO: Active client connections: 142 sessions (peak: 180)',
  '<26>Oct 21 13:12:10 pfsense.nipponbpo.local squid[2345]: 2026/10/21 13:12:10| ERROR: Client 192.168.0.141 aborted connection before response headers sent',
  '<29>Oct 21 13:12:30 pfsense.nipponbpo.local squid[2345]: 2026/10/21 13:12:30| NOTICE: Reconfiguring Squid proxy cache from squid.conf',

  // pfSense Firewall (filterlog) Events
  '<134>Oct 21 13:10:05 pfsense.nipponbpo.local filterlog[1122]: 4,,,1000000103,igb0,match,block,in,4,0x0,,64,0,0,DF,6,tcp,44,198.51.100.42,192.168.0.1,445,445,0,S,123456,,',
  '<134>Oct 21 13:10:22 pfsense.nipponbpo.local filterlog[1122]: 4,,,1000000103,igb0,match,block,in,4,0x0,,64,0,0,DF,6,tcp,40,45.33.32.156,192.168.0.1,22,22,0,S,345678,,',
  '<134>Oct 21 13:10:55 pfsense.nipponbpo.local filterlog[1122]: 4,,,1000000103,igb0,match,block,in,4,0x0,,64,0,0,DF,17,udp,78,203.0.113.88,192.168.0.1,5353,5353,58',
  '<134>Oct 21 13:11:30 pfsense.nipponbpo.local filterlog[1122]: 4,,,1000000103,igb0,match,block,in,4,0x0,,64,0,0,DF,6,tcp,44,185.220.101.5,192.168.0.1,3389,3389,0,S,567890,,',
  '<134>Oct 21 13:12:00 pfsense.nipponbpo.local filterlog[1122]: 4,,,1000000104,igb1,match,pass,out,4,0x0,,64,0,0,DF,6,tcp,60,192.168.0.141,142.250.190.46,54321,443,0,S,987654,,',

  // pfSense Gateway Monitor (dpinger) Events
  '<29>Oct 21 13:10:10 pfsense.nipponbpo.local dpinger[3344]: WAN_DHCP 192.168.0.1: Latency 14.8ms, stddev 2.1ms, loss 0%',
  '<28>Oct 21 13:11:15 pfsense.nipponbpo.local dpinger[3344]: WAN_DHCP 192.168.0.1: Warning: Packet loss 4.5% detected on upstream gateway',
  '<29>Oct 21 13:11:40 pfsense.nipponbpo.local dpinger[3344]: WAN_DHCP 192.168.0.1: Upstream latency recovered to 13.2ms',

  // DHCP Server (dhcpd) Events
  '<30>Oct 21 13:10:08 pfsense.nipponbpo.local dhcpd[4455]: DHCPREQUEST for 192.168.0.141 (WS-FINANCE-04) from 00:1a:2b:3c:4d:5e via igb1',
  '<30>Oct 21 13:10:08 pfsense.nipponbpo.local dhcpd[4455]: DHCPACK on 192.168.0.141 to 00:1a:2b:3c:4d:5e (WS-FINANCE-04) via igb1',
  '<30>Oct 21 13:11:50 pfsense.nipponbpo.local dhcpd[4455]: DHCPREQUEST for 192.168.0.155 (WS-DEV-12) from f4:5c:89:12:34:56 via igb1',
  '<30>Oct 21 13:11:50 pfsense.nipponbpo.local dhcpd[4455]: DHCPACK on 192.168.0.155 to f4:5c:89:12:34:56 (WS-DEV-12) via igb1',

  // OpenVPN & SSH Access Events
  '<86>Oct 21 13:10:40 pfsense.nipponbpo.local sshd[5566]: Accepted publickey for admin from 192.168.0.100 port 52314 ssh2',
  '<85>Oct 21 13:11:20 pfsense.nipponbpo.local sshd[5566]: Failed password for invalid user root from 198.51.100.99 port 41203 ssh2',
  '<30>Oct 21 13:12:05 pfsense.nipponbpo.local openvpn[6677]: user \'rajesh.k\' authenticated successfully from 122.161.45.12:48921',
  '<27>Oct 21 13:12:40 pfsense.nipponbpo.local openvpn[6677]: TLS Error: TLS handshake failed for 185.220.101.9:51234',

  // System Kernel & Cron Events
  '<30>Oct 21 13:10:00 pfsense.nipponbpo.local cron[7788]: (root) CMD (/usr/bin/nice -n20 /usr/local/bin/php-cgi -f /etc/rc.filter_configure_sync)',
  '<26>Oct 21 13:12:55 pfsense.nipponbpo.local kernel: arp: 192.168.0.254 moved from 00:11:22:33:44:55 to 00:aa:bb:cc:dd:ee on igb1',
];

export async function generateDemoSyslog(count = 200) {
  console.log(`[Demo Syslog] Generating ${count} realistic pfSense & Squid syslog events...`);
  const inserter = getSyslogInserter();

  const now = Date.now();
  // Spread timestamps across the last 24 hours
  for (let i = 0; i < count; i++) {
    const rawTemplate = SAMPLE_EVENTS[i % SAMPLE_EVENTS.length];
    // Offset each event by a few minutes
    const timeOffsetMs = (count - i) * 60 * 1000 * (0.5 + Math.random() * 0.5);
    const eventTime = now - timeOffsetMs;

    const event = parseSyslogMessage(rawTemplate, '192.168.0.1');
    event.timestamp = Math.round(eventTime);

    inserter.push(event);
  }

  const flushed = inserter.flush();
  console.log(`[Demo Syslog] Successfully committed ${flushed} syslog events to SQLite!`);
}

if (require.main === module || process.argv[1]?.includes('demo-syslog-generator')) {
  generateDemoSyslog(300).then(() => {
    process.exit(0);
  });
}
