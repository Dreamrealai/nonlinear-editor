import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

type LogEntry = {
  level: string;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
};

// Maximum size for a single log entry (10KB)
const MAX_LOG_ENTRY_SIZE = 10 * 1024;

// Maximum total request size (100KB)
const MAX_REQUEST_SIZE = 100 * 1024;

async function handleLogsPost(request: NextRequest, { user }: { user: { id: string } }) {
  try {
    const { logs } = await request.json() as { logs: LogEntry[] };

    if (!Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Invalid logs format' },
        { status: 400 }
      );
    }

    // Validate log count (max 100 logs per request)
    if (logs.length > 100) {
      return NextResponse.json(
        { error: 'Too many logs. Maximum 100 logs per request.' },
        { status: 400 }
      );
    }

    // Validate each log entry size
    let totalSize = 0;
    for (const log of logs) {
      const logSize = JSON.stringify(log).length;
      if (logSize > MAX_LOG_ENTRY_SIZE) {
        return NextResponse.json(
          { error: `Log entry exceeds maximum size of ${MAX_LOG_ENTRY_SIZE} bytes` },
          { status: 400 }
        );
      }
      totalSize += logSize;
    }

    // Validate total request size
    if (totalSize > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: `Total logs size exceeds maximum of ${MAX_REQUEST_SIZE} bytes` },
        { status: 400 }
      );
    }

    // Send to Axiom using fetch API
    const axiomToken = process.env.AXIOM_TOKEN;
    const axiomDataset = process.env.AXIOM_DATASET;

    // Add user ID to all logs for tracking
    const enrichedLogs = logs.map(log => ({
      ...log,
      userId: user.id,
    }));

    if (!axiomToken || !axiomDataset) {
      // In development or if Axiom not configured, just log to console
      if (process.env.NODE_ENV === 'development') {
        enrichedLogs.forEach((log) => {
          const level = log.level;
          if (level === 'error') {
            console.error(`[${log.timestamp}] [${log.userId}] ${log.message}`, log.data || '');
          } else if (level === 'warn') {
            console.warn(`[${log.timestamp}] [${log.userId}] ${log.message}`, log.data || '');
          } else if (level === 'debug') {
            console.debug(`[${log.timestamp}] [${log.userId}] ${log.message}`, log.data || '');
          } else {
            console.log(`[${log.timestamp}] [${log.userId}] ${log.message}`, log.data || '');
          }
        });
      }
      return NextResponse.json({ success: true, count: logs.length });
    }

    // Send logs to Axiom
    const response = await fetch(
      `https://api.axiom.co/v1/datasets/${axiomDataset}/ingest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${axiomToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrichedLogs.map(log => ({
          ...log,
          _time: log.timestamp,
          source: 'browser',
        }))),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Axiom ingest failed:', errorText);
      return NextResponse.json({ success: false, error: 'Failed to send logs to Axiom' }, { status: 200 });
    }

    return NextResponse.json({ success: true, count: logs.length });
  } catch (error) {
    console.error('Log endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export authenticated POST handler with rate limiting
// Rate limit: 100 logs per minute per user
export const POST = withAuth(handleLogsPost, {
  route: '/api/logs',
  rateLimit: RATE_LIMITS.relaxed, // 100 requests per minute
});
