import crypto from 'crypto';
import { serverLogger } from './serverLogger';

/**
 * Webhook event types for long-running operations
 */
export type WebhookEventType =
  | 'video.generation.completed'
  | 'video.generation.failed'
  | 'audio.generation.completed'
  | 'audio.generation.failed';

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: {
    operationId: string;
    userId: string;
    projectId: string;
    status: 'completed' | 'failed';
    result?: {
      assetId?: string;
      storageUrl?: string;
      metadata?: Record<string, unknown>;
    };
    error?: string;
  };
}

/**
 * Options for webhook delivery with retry configuration
 */
export interface WebhookDeliveryOptions {
  url: string;
  payload: WebhookPayload;
  secret?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Result of webhook delivery attempt
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  attempts: number;
  error?: string;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * This allows recipients to verify the webhook is authentic
 *
 * @param payload - The webhook payload to sign
 * @param secret - Secret key for HMAC signature
 * @returns Base64-encoded signature
 */
export function generateWebhookSignature(payload: WebhookPayload, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return hmac.digest('base64');
}

/**
 * Verify webhook signature
 *
 * @param payload - The webhook payload
 * @param signature - The signature to verify
 * @param secret - Secret key for HMAC verification
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: WebhookPayload,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    // If buffers have different lengths, timingSafeEqual throws
    return false;
  }
}

/**
 * Calculate exponential backoff delay
 *
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param maxDelay - Maximum delay in milliseconds (default: 60000)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, baseDelay = 1000, maxDelay = 60000): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Deliver webhook with automatic retry and exponential backoff
 *
 * Retry strategy:
 * - Attempt 1: Immediate
 * - Attempt 2: ~1 second
 * - Attempt 3: ~2 seconds
 * - Attempt 4: ~4 seconds
 * - Attempt 5: ~8 seconds
 *
 * @param options - Webhook delivery options
 * @returns Delivery result with success status and metadata
 */
export async function deliverWebhook(
  options: WebhookDeliveryOptions
): Promise<WebhookDeliveryResult> {
  const {
    url,
    payload,
    secret = process.env['WEBHOOK_SECRET'] || 'default-webhook-secret',
    maxRetries = 5,
    timeout = 30000, // 30 seconds
  } = options;

  const signature = generateWebhookSignature(payload, secret);
  let lastError: string | undefined;
  let statusCode: number | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add delay for retries (not on first attempt)
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1);
        serverLogger.debug(
          {
            event: 'webhook.retry_delay',
            url,
            attempt: attempt + 1,
            delay,
          },
          `Waiting ${delay}ms before retry attempt ${attempt + 1}`
        );
        await new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, delay));
      }

      serverLogger.info(
        {
          event: 'webhook.delivery_attempt',
          url,
          attempt: attempt + 1,
          eventType: payload.event,
          operationId: payload.data.operationId,
        },
        `Attempting webhook delivery (attempt ${attempt + 1}/${maxRetries})`
      );

      const controller = new AbortController();
      const timeoutId = setTimeout((): void => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'User-Agent': 'NonLinearEditor-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = response.status;

      // Success: 2xx status codes
      if (response.status >= 200 && response.status < 300) {
        serverLogger.info(
          {
            event: 'webhook.delivery_success',
            url,
            statusCode: response.status,
            attempts: attempt + 1,
            eventType: payload.event,
            operationId: payload.data.operationId,
          },
          `Webhook delivered successfully on attempt ${attempt + 1}`
        );

        return {
          success: true,
          statusCode: response.status,
          attempts: attempt + 1,
        };
      }

      // Client error (4xx): Don't retry (except 408, 429)
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429
      ) {
        const errorText = await response.text().catch((): string => 'Unknown error');
        lastError = `HTTP ${response.status}: ${errorText}`;

        serverLogger.warn(
          {
            event: 'webhook.client_error',
            url,
            statusCode: response.status,
            error: errorText,
            eventType: payload.event,
          },
          `Webhook delivery failed with client error (no retry): ${lastError}`
        );

        return {
          success: false,
          statusCode: response.status,
          attempts: attempt + 1,
          error: lastError,
        };
      }

      // Server error (5xx) or retriable client errors (408, 429): Retry
      const errorText = await response.text().catch((): string => 'Unknown error');
      lastError = `HTTP ${response.status}: ${errorText}`;

      serverLogger.warn(
        {
          event: 'webhook.server_error',
          url,
          statusCode: response.status,
          attempt: attempt + 1,
          error: errorText,
        },
        `Webhook delivery failed with server error (will retry): ${lastError}`
      );
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = `Request timeout after ${timeout}ms`;
        } else {
          lastError = error.message;
        }
      } else {
        lastError = 'Unknown error';
      }

      serverLogger.error(
        {
          event: 'webhook.network_error',
          url,
          attempt: attempt + 1,
          error: lastError,
        },
        `Webhook delivery failed with network error: ${lastError}`
      );
    }
  }

  // All retries exhausted
  serverLogger.error(
    {
      event: 'webhook.delivery_failed',
      url,
      attempts: maxRetries,
      lastError,
      eventType: payload.event,
      operationId: payload.data.operationId,
    },
    `Webhook delivery failed after ${maxRetries} attempts`
  );

  return {
    success: false,
    statusCode,
    attempts: maxRetries,
    error: lastError || 'All retry attempts failed',
  };
}

/**
 * Validate webhook URL format
 * Ensures URL is HTTPS and properly formatted
 *
 * @param url - URL to validate
 * @returns True if valid
 */
export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

<<<<<<< Updated upstream
    // Must be HTTP or HTTPS
=======
    // Only allow http and https protocols
>>>>>>> Stashed changes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Must be HTTPS in production (allow HTTP in development)
    if (process.env['NODE_ENV'] === 'production' && parsed.protocol !== 'https:') {
      return false;
    }

<<<<<<< Updated upstream
    // Must have a valid host with at least one dot (e.g., example.com) or be localhost
    // This rejects single-word hosts that could be interpreted paths like "webhook"
    if (!parsed.host || (!parsed.host.includes('.') && !parsed.host.startsWith('localhost'))) {
=======
    // Must have a host (hostname is more reliable than host)
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return false;
    }

    // Check for malformed URLs like https:///path (hostname would be the path)
    // The part after '//' should not start with '/'
    const afterProtocol = url.split('//')[1];
    if (!afterProtocol || afterProtocol.startsWith('/')) {
>>>>>>> Stashed changes
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
