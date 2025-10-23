/**
 * Ultra-thin Axiom transport for Pino
 *
 * Batches logs and sends to Axiom with minimal overhead.
 * Designed for serverless environments (Next.js/Vercel).
 */

type LogEntry = {
  level: number;
  time: number;
  msg: string;
  [key: string]: unknown;
};

const BATCH_SIZE = 5; // Smaller batch size for faster sending in serverless
const BATCH_INTERVAL_MS = 1000; // Even shorter interval for serverless (1 second)
const AXIOM_API = 'https://api.axiom.co/v1/datasets';

class AxiomTransport {
  private queue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly token: string;
  private readonly dataset: string;
  private readonly enabled: boolean;

  constructor() {
    this.token = process.env.AXIOM_TOKEN || '';
    this.dataset = process.env.AXIOM_DATASET || '';
    this.enabled = Boolean(this.token && this.dataset);

    // Flush on process exit (important for serverless)
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => {
        this.flush(true);
      });
    }
  }

  write(log: LogEntry) {
    if (!this.enabled) {
      return; // Skip if Axiom not configured
    }

    this.queue.push(log);

    // In serverless, flush more aggressively
    // Flush immediately for error and warn levels
    const shouldFlushImmediately = log.level >= 40 || this.queue.length >= BATCH_SIZE;

    if (shouldFlushImmediately) {
      this.flush();
    } else {
      // Schedule flush if not already scheduled
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flush();
        }, BATCH_INTERVAL_MS);
      }
    }
  }

  async flush(sync = false) {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const logsToSend = [...this.queue];
    this.queue = [];

    const sendLogs = async () => {
      try {
        const response = await fetch(`${AXIOM_API}/${this.dataset}/ingest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            logsToSend.map(log => {
              const { level: levelNum, msg, time, ...rest } = log;
              return {
                _time: new Date(time).toISOString(),
                level: this.levelToString(levelNum),
                message: msg,
                source: 'server',
                ...rest,
              };
            })
          ),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Always log Axiom failures to console for debugging
          console.error('Axiom ingest failed:', response.status, errorText);
        } else {
          // Log success in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`✓ Sent ${logsToSend.length} logs to Axiom`);
          }
        }
      } catch (error) {
        // Silently fail to avoid crashing the app
        if (process.env.NODE_ENV === 'development') {
          console.error('Axiom transport error:', error);
        }
      }
    };

    if (sync) {
      await sendLogs();
    } else {
      // Fire and forget in serverless
      sendLogs().catch(() => {
        // Ignore errors
      });
    }
  }

  private levelToString(level: number): string {
    if (level >= 60) return 'fatal';
    if (level >= 50) return 'error';
    if (level >= 40) return 'warn';
    if (level >= 30) return 'info';
    if (level >= 20) return 'debug';
    return 'trace';
  }
}

// Singleton instance
export const axiomTransport = new AxiomTransport();
