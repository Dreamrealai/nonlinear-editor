import { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validationError, errorResponse, successResponse } from '@/lib/api/response';
import { validateInteger, ValidationError } from '@/lib/validation';

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

async function handleLogsPost(request: NextRequest, context: AuthContext) {
  const { user } = context;
  try {
    const { logs } = (await request.json()) as { logs: LogEntry[] };

    if (!Array.isArray(logs)) {
      return validationError('Invalid logs format', 'logs');
    }

    // Validate log count (max 100 logs per request)
    try {
      validateInteger(logs.length, 'logs.length', { required: true, min: 1, max: 100 });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message, error.field);
      }
      throw error;
    }

    // Validate each log entry size
    let totalSize = 0;
    for (const log of logs) {
      const logSize = JSON.stringify(log).length;
      if (logSize > MAX_LOG_ENTRY_SIZE) {
        return validationError(
          `Log entry exceeds maximum size of ${MAX_LOG_ENTRY_SIZE} bytes`,
          'logs'
        );
      }
      totalSize += logSize;
    }

    // Validate total request size
    if (totalSize > MAX_REQUEST_SIZE) {
      return validationError(
        `Total logs size exceeds maximum of ${MAX_REQUEST_SIZE} bytes`,
        'logs'
      );
    }

    // Send to Axiom using fetch API
    const axiomToken = process.env['AXIOM_TOKEN'];
    const axiomDataset = process.env['AXIOM_DATASET'];

    // Add user ID to all logs for tracking
    const enrichedLogs = logs.map((log) => ({
      ...log,
      userId: user.id,
    }));

    if (!axiomToken || !axiomDataset) {
      // In development or if Axiom not configured, just log to console
      if (process.env['NODE_ENV'] === 'development') {
        enrichedLogs.forEach((log) => {
          const level = log.level;
          if (level === 'error') {
            serverLogger.error(
              { ...log.data, timestamp: log.timestamp, userId: log.userId },
              log.message
            );
          } else if (level === 'warn') {
            serverLogger.warn(
              { ...log.data, timestamp: log.timestamp, userId: log.userId },
              log.message
            );
          } else if (level === 'debug') {
            serverLogger.debug(
              { ...log.data, timestamp: log.timestamp, userId: log.userId },
              log.message
            );
          } else {
            serverLogger.info(
              { ...log.data, timestamp: log.timestamp, userId: log.userId },
              log.message
            );
          }
        });
      }
      return successResponse({ success: true, count: logs.length });
    }

    // Send logs to Axiom
    const response = await fetch(`https://api.axiom.co/v1/datasets/${axiomDataset}/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${axiomToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        enrichedLogs.map((log) => ({
          ...log,
          _time: log.timestamp,
          source: 'browser',
        }))
      ),
    });

    if (!response.ok) {
      const errorText = await response.text();
      serverLogger.error({ errorText, userId: user.id }, 'Axiom ingest failed');
      return successResponse({ success: false, error: 'Failed to send logs to Axiom' });
    }

    return successResponse({ success: true, count: logs.length });
  } catch (error) {
    serverLogger.error({ error }, 'Log endpoint error');
    return errorResponse('Internal server error', 500);
  }
}

// Export authenticated POST handler with rate limiting
// Rate limit: 100 logs per minute per user
export const POST = withAuth(handleLogsPost, {
  route: '/api/logs',
  rateLimit: RATE_LIMITS.tier4_general, // TIER 4: 60 requests per minute (reduced from 100/min)
});
