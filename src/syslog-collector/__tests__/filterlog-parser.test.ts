import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFilterlogCsv, formatPfSenseTcpFlags } from '../filterlog-parser';

test('formatPfSenseTcpFlags correctly expands pfSense flag characters', () => {
  assert.equal(formatPfSenseTcpFlags('S'), 'SYN');
  assert.equal(formatPfSenseTcpFlags('SA'), 'SYN,ACK');
  assert.equal(formatPfSenseTcpFlags('FA'), 'FIN,ACK');
  assert.equal(formatPfSenseTcpFlags('RA'), 'RST,ACK');
  assert.equal(formatPfSenseTcpFlags('PA'), 'PSH,ACK');
  assert.equal(formatPfSenseTcpFlags('-'), '-');
});

test('parseFilterlogCsv parses real pfSense IPv4 TCP block event', () => {
  // Real sample: rule 4, tracker 1000000103, interface em0, action block, in, IPv4, TCP, 192.168.1.50:51423 -> 198.51.100.1:443, SYN
  const raw = '4,,,1000000103,em0,match,block,in,4,0x0,,64,0,0,DF,6,tcp,60,192.168.1.50,198.51.100.1,51423,443,0,S,1234567890,,1024,,';
  const parsed = parseFilterlogCsv(raw);

  assert.ok(parsed);
  assert.equal(parsed.tracker, '1000000103');
  assert.equal(parsed.interface, 'em0');
  assert.equal(parsed.reason, 'match');
  assert.equal(parsed.action, 'block');
  assert.equal(parsed.direction, 'in');
  assert.equal(parsed.ipVersion, 4);
  assert.equal(parsed.protocol, 'TCP');
  assert.equal(parsed.srcIp, '192.168.1.50');
  assert.equal(parsed.dstIp, '198.51.100.1');
  assert.equal(parsed.srcPort, 51423);
  assert.equal(parsed.dstPort, 443);
  assert.equal(parsed.tcpFlags, 'SYN');
});

test('parseFilterlogCsv parses real pfSense IPv4 UDP pass event', () => {
  // Real sample: DNS query over UDP passed
  const raw = '5,,,1000000104,igb1,match,pass,out,4,0x0,,64,1234,0,none,17,udp,72,192.168.0.10,8.8.8.8,54321,53,52';
  const parsed = parseFilterlogCsv(raw);

  assert.ok(parsed);
  assert.equal(parsed.interface, 'igb1');
  assert.equal(parsed.action, 'pass');
  assert.equal(parsed.direction, 'out');
  assert.equal(parsed.ipVersion, 4);
  assert.equal(parsed.protocol, 'UDP');
  assert.equal(parsed.srcIp, '192.168.0.10');
  assert.equal(parsed.dstIp, '8.8.8.8');
  assert.equal(parsed.srcPort, 54321);
  assert.equal(parsed.dstPort, 53);
});

test('parseFilterlogCsv parses pfSense IPv4 ICMP block event', () => {
  // Real sample: ICMP echo request blocked
  const raw = '10,,,1000000110,em0,match,block,in,4,0x0,,128,5432,0,none,1,icmp,84,10.0.0.5,192.168.1.1,request';
  const parsed = parseFilterlogCsv(raw);

  assert.ok(parsed);
  assert.equal(parsed.action, 'block');
  assert.equal(parsed.ipVersion, 4);
  assert.equal(parsed.protocol, 'ICMP');
  assert.equal(parsed.srcIp, '10.0.0.5');
  assert.equal(parsed.dstIp, '192.168.1.1');
});

test('parseFilterlogCsv parses pfSense IPv6 TCP block event', () => {
  // Real sample IPv6 TCP block
  const raw = '18,,,1000000105,em0,match,block,in,6,0x00,0x00000,64,tcp,6,60,2001:db8::1,2001:db8::2,49152,80,0,S,987654321,,2048,,';
  const parsed = parseFilterlogCsv(raw);

  assert.ok(parsed);
  assert.equal(parsed.action, 'block');
  assert.equal(parsed.ipVersion, 6);
  assert.equal(parsed.protocol, 'TCP');
  assert.equal(parsed.srcIp, '2001:db8::1');
  assert.equal(parsed.dstIp, '2001:db8::2');
  assert.equal(parsed.srcPort, 49152);
  assert.equal(parsed.dstPort, 80);
  assert.equal(parsed.tcpFlags, 'SYN');
});

test('parseFilterlogCsv returns null on invalid or short lines', () => {
  assert.equal(parseFilterlogCsv(''), null);
  assert.equal(parseFilterlogCsv('invalid,csv,data'), null);
});
