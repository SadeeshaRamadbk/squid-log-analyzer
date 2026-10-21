/**
 * Structured logging utility for Nippon BPO Network Observability Platform
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service?: string;
  module?: string;
  userId?: number | string;
  clientIp?: string;
  requestId?: string;
  [key: string]: any;
}

export interface StructuredLogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class StructuredLogger {
  private service: string;

  constructor(service = 'squid-log-analyzer') {
    this.service = service;
  }

  private formatError(err: unknown) {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }
    if (typeof err === 'string') {
      return { name: 'Error', message: err };
    }
    return undefined;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, any>, context?: LogContext) {
    const isProd = process.env.NODE_ENV === 'production';
    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { service: this.service, ...context },
      metadata: meta,
    };

    if (meta?.error) {
      payload.error = this.formatError(meta.error);
      delete meta.error;
    }

    if (isProd) {
      // In production, emit single-line structured JSON
      const jsonStr = JSON.stringify(payload);
      if (level === 'error') {
        console.error(jsonStr);
      } else if (level === 'warn') {
        console.warn(jsonStr);
      } else {
        console.log(jsonStr);
      }
    } else {
      // In local development, emit readable formatted line with structured metadata
      const time = payload.timestamp.slice(11, 19);
      const levelTag = level.toUpperCase().padEnd(5);
      const svc = payload.context?.service ? `[${payload.context.service}]` : '';
      const prefix = `${time} ${levelTag} ${svc} ${message}`;

      if (level === 'error') {
        console.error(prefix, meta || '', payload.error || '');
      } else if (level === 'warn') {
        console.warn(prefix, meta || '');
      } else {
        console.log(prefix, meta || '');
      }
    }
  }

  debug(message: string, meta?: Record<string, any>, context?: LogContext) {
    this.write('debug', message, meta, context);
  }

  info(message: string, meta?: Record<string, any>, context?: LogContext) {
    this.write('info', message, meta, context);
  }

  warn(message: string, meta?: Record<string, any>, context?: LogContext) {
    this.write('warn', message, meta, context);
  }

  error(message: string, meta?: Record<string, any>, context?: LogContext) {
    this.write('error', message, meta, context);
  }

  withContext(ctx: LogContext): StructuredLogger {
    const child = new StructuredLogger(ctx.service || this.service);
    return child;
  }
}

export const logger = new StructuredLogger();
