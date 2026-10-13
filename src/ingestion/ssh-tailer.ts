import { Client, ConnectConfig } from 'ssh2';
import fs from 'fs';
import { parseSquidLogLine } from './log-parser';
import { BatchInserter } from './batch-inserter';

export interface SshTailerOptions {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  logPath: string;
  reconnectIntervalMs?: number;
}

export class SshLogTailer {
  private client: Client | null = null;
  private inserter: BatchInserter;
  private options: SshTailerOptions;
  private isRunning = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lineBuffer = '';

  constructor(options: SshTailerOptions, inserter: BatchInserter) {
    this.options = {
      port: 22,
      reconnectIntervalMs: 5000,
      ...options,
    };
    this.inserter = inserter;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[SSH Tailer] Initializing connection to ${this.options.username}@${this.options.host}:${this.options.port}...`);
    this.connect();
  }

  private connect(): void {
    if (!this.isRunning) return;

    this.client = new Client();

    const connectConfig: ConnectConfig = {
      host: this.options.host,
      port: this.options.port,
      username: this.options.username,
      keepaliveInterval: 10000,
      readyTimeout: 20000,
    };

    if (this.options.privateKeyPath && fs.existsSync(this.options.privateKeyPath)) {
      connectConfig.privateKey = fs.readFileSync(this.options.privateKeyPath);
    } else if (this.options.password) {
      connectConfig.password = this.options.password;
    } else {
      console.warn('[SSH Tailer] Warning: Neither valid private key nor password specified. Attempting agent/default auth.');
    }

    this.client.on('ready', () => {
      console.log(`[SSH Tailer] Connected successfully to ${this.options.host}! Starting tail on ${this.options.logPath}...`);
      this.startTail();
    });

    this.client.on('error', (err) => {
      console.error(`[SSH Tailer] SSH connection error:`, err.message);
      this.scheduleReconnect();
    });

    this.client.on('close', () => {
      console.warn(`[SSH Tailer] Connection closed.`);
      this.scheduleReconnect();
    });

    this.client.on('end', () => {
      console.warn(`[SSH Tailer] Connection ended.`);
      this.scheduleReconnect();
    });

    try {
      this.client.connect(connectConfig);
    } catch (err: any) {
      console.error(`[SSH Tailer] Failed to initiate connection:`, err.message);
      this.scheduleReconnect();
    }
  }

  private startTail(): void {
    if (!this.client) return;

    // tail -F follows log rotation and keeps retrying if truncated
    const command = `tail -F -n 100 ${this.options.logPath}`;

    this.client.exec(command, (err, stream) => {
      if (err) {
        console.error(`[SSH Tailer] Failed to execute tail command:`, err.message);
        this.scheduleReconnect();
        return;
      }

      console.log(`[SSH Tailer] Executing command: ${command}`);

      stream.on('data', (chunk: Buffer) => {
        this.processStreamData(chunk.toString('utf-8'));
      });

      stream.stderr.on('data', (stderrData: Buffer) => {
        console.error(`[SSH Tailer Remote stderr]: ${stderrData.toString('utf-8').trim()}`);
      });

      stream.on('close', (code: any, signal: any) => {
        console.warn(`[SSH Tailer] Tail stream closed with code: ${code}, signal: ${signal}`);
        this.scheduleReconnect();
      });
    });
  }

  private processStreamData(chunk: string): void {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split('\n');

    // Retain incomplete last line in buffer
    this.lineBuffer = lines.pop() || '';

    for (const rawLine of lines) {
      const parsed = parseSquidLogLine(rawLine);
      if (parsed) {
        this.inserter.push(parsed);
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning) return;
    if (this.reconnectTimer) return;

    if (this.client) {
      try {
        this.client.end();
      } catch {}
      this.client = null;
    }

    const interval = this.options.reconnectIntervalMs || 5000;
    console.log(`[SSH Tailer] Reconnecting in ${interval / 1000} seconds...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, interval);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      try {
        this.client.end();
      } catch {}
      this.client = null;
    }
    // Flush remaining buffer
    if (this.lineBuffer.trim()) {
      const parsed = parseSquidLogLine(this.lineBuffer);
      if (parsed) this.inserter.push(parsed);
      this.lineBuffer = '';
    }
    this.inserter.close();
    console.log('[SSH Tailer] Stopped.');
  }
}
