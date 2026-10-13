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
  110: 'POP3',
  123: 'NTP',
  143: 'IMAP',
  161: 'SNMP',
  389: 'LDAP',
  443: 'HTTPS',
  445: 'SMB',
  465: 'SMTPS',
  587: 'SMTP-Submission',
  636: 'LDAPS',
  993: 'IMAPS',
  995: 'POP3S',
  1194: 'OpenVPN',
  1433: 'MS-SQL',
  1521: 'Oracle',
  2049: 'NFS',
  3306: 'MySQL',
  3389: 'RDP',
  5060: 'SIP',
  51820: 'WireGuard',
  5432: 'PostgreSQL',
  5900: 'VNC',
  6379: 'Redis',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
  9000: 'SonarQube',
  9090: 'Prometheus',
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

export function resolveServiceName(port: number): string {
  return WELL_KNOWN_PORTS[port] || `Port ${port}`;
}

export function resolveProtocolName(protocolNumber: number): string {
  return PROTOCOL_NAMES[protocolNumber] || `Proto ${protocolNumber}`;
}
