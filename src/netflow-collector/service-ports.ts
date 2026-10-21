export const WELL_KNOWN_PORTS: Record<number, string> = {
  20: 'FTP-Data',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  67: 'DHCP',
  68: 'DHCP',
  80: 'HTTP',
  88: 'Kerberos',
  110: 'POP3',
  123: 'NTP',
  137: 'NetBIOS-NS',
  138: 'NetBIOS-DGM',
  139: 'NetBIOS-SSN',
  143: 'IMAP',
  161: 'SNMP',
  389: 'LDAP',
  443: 'HTTPS',
  445: 'SMB',
  465: 'SMTPS',
  587: 'SMTP-Submission',
  631: 'IPP-Print',
  636: 'LDAPS',
  993: 'IMAPS',
  995: 'POP3S',
  1194: 'OpenVPN',
  1433: 'MS-SQL',
  1521: 'Oracle',
  1883: 'MQTT',
  1900: 'SSDP',
  2049: 'NFS',
  2055: 'NetFlow',
  3000: 'Next.js/Dev',
  3128: 'Squid Proxy',
  3306: 'MySQL',
  3389: 'RDP',
  3478: 'STUN/WebRTC',
  3479: 'STUN/WebRTC',
  5060: 'SIP',
  51820: 'WireGuard',
  5222: 'XMPP/Jabber',
  5228: 'Google FCM',
  5353: 'mDNS',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8000: 'HTTP-Dev',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  8801: 'Zoom Media',
  8802: 'Zoom Media',
  8883: 'MQTT-TLS',
  9000: 'SonarQube',
  9090: 'Prometheus',
  9100: 'RAW-Print',
  9995: 'NetFlow',
  27017: 'MongoDB',
};

export const PROTOCOL_NAMES: Record<number, string> = {
  1: 'ICMP',
  2: 'IGMP',
  6: 'TCP',
  17: 'UDP',
  47: 'GRE',
  50: 'ESP',
  51: 'AH',
  58: 'IPv6-ICMP',
  89: 'OSPF',
  112: 'VRRP',
  132: 'SCTP',
};

/**
 * Determine the server-side listening port and its service name
 * Avoids misclassifying ephemeral client source ports (e.g. 59429, 63910)
 */
export function classifyService(srcPort: number, dstPort: number, protocol = 'TCP'): { port: number; serviceName: string } {
  const isUdp = protocol.toUpperCase() === 'UDP';

  // Helper to format service name considering UDP/QUIC
  const getPortName = (p: number) => {
    if (p === 443 && isUdp) return 'QUIC / HTTP3';
    return WELL_KNOWN_PORTS[p] || `Port ${p}`;
  };

  // If destination port is known or < 1024, it's typically the server port
  if (WELL_KNOWN_PORTS[dstPort] || dstPort < 1024) {
    return {
      port: dstPort,
      serviceName: getPortName(dstPort),
    };
  }

  // If source port is known or < 1024, traffic is server responding to client
  if (WELL_KNOWN_PORTS[srcPort] || srcPort < 1024) {
    return {
      port: srcPort,
      serviceName: getPortName(srcPort),
    };
  }

  // If both ports are in the IANA ephemeral range (>= 49152)
  if (srcPort >= 49152 && dstPort >= 49152) {
    return {
      port: 49152,
      serviceName: 'Ephemeral / Dynamic (49152+)',
    };
  }

  // Use the lower port as likely server port
  const serverPort = Math.min(srcPort, dstPort);
  if (serverPort >= 49152) {
    return {
      port: 49152,
      serviceName: 'Ephemeral / Dynamic (49152+)',
    };
  }

  return {
    port: serverPort,
    serviceName: getPortName(serverPort),
  };
}

export function resolveServiceName(port: number): string {
  if (port >= 49152) return 'Ephemeral / Dynamic (49152+)';
  return WELL_KNOWN_PORTS[port] || `Port ${port}`;
}

export function resolveProtocolName(protocolNumber: number): string {
  return PROTOCOL_NAMES[protocolNumber] || `Proto ${protocolNumber}`;
}
