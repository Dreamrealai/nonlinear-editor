/**
 * Server-side logger for API routes and server components
 * Uses console with structured logging format
 */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogData {
  [key: string]: unknown;
}

class ServerLogger {
  private createLogEntry(level: LogLevel, data: LogData | undefined, message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };
    return logEntry;
  }

  trace(data: LogData | undefined, message: string) {
    const entry = this.createLogEntry('trace', data, message);
    console.debug('[TRACE]', JSON.stringify(entry));
  }

  debug(data: LogData | undefined, message: string) {
    const entry = this.createLogEntry('debug', data, message);
    console.debug('[DEBUG]', JSON.stringify(entry));
  }

  info(data: LogData | undefined, message: string) {
    const entry = this.createLogEntry('info', data, message);
    console.log('[INFO]', JSON.stringify(entry));
  }

  warn(data: LogData | undefined, message: string) {
    const entry = this.createLogEntry('warn', data, message);
    console.warn('[WARN]', JSON.stringify(entry));
  }

  error(data: LogData | undefined, message: string) {
    const entry = this.createLogEntry('error', data, message);
    console.error('[ERROR]', JSON.stringify(entry));
  }

  fatal(data: LogData | undefined, message: string) {
    const entry = this.createLogEntry('fatal', data, message);
    console.error('[FATAL]', JSON.stringify(entry));
  }

  child(data: LogData) {
    return new ChildLogger(this, data);
  }
}

class ChildLogger extends ServerLogger {
  constructor(
    private parent: ServerLogger,
    private context: LogData
  ) {
    super();
  }

  private mergeContext(data: LogData | undefined): LogData {
    return { ...this.context, ...data };
  }

  trace(data: LogData | undefined, message: string) {
    super.trace(this.mergeContext(data), message);
  }

  debug(data: LogData | undefined, message: string) {
    super.debug(this.mergeContext(data), message);
  }

  info(data: LogData | undefined, message: string) {
    super.info(this.mergeContext(data), message);
  }

  warn(data: LogData | undefined, message: string) {
    super.warn(this.mergeContext(data), message);
  }

  error(data: LogData | undefined, message: string) {
    super.error(this.mergeContext(data), message);
  }

  fatal(data: LogData | undefined, message: string) {
    super.fatal(this.mergeContext(data), message);
  }
}

export const serverLogger = new ServerLogger();
