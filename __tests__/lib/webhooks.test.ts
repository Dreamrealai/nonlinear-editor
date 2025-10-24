import crypto from 'crypto';
import {
  generateWebhookSignature,
  verifyWebhookSignature,
  deliverWebhook,
  validateWebhookUrl,
  type WebhookPayload,
} from '@/lib/webhooks';

describe('Webhook Utilities', () => {
  const mockPayload: WebhookPayload = {
    event: 'video.generation.completed',
    timestamp: '2025-10-24T12:00:00.000Z',
    data: {
      operationId: 'test-operation-123',
      userId: 'user-abc',
      projectId: 'project-def',
      status: 'completed',
      result: {
        assetId: 'asset-ghi',
        storageUrl: 'supabase://assets/test.mp4',
      },
    },
  };

  const secret = 'test-secret-key';

  describe('generateWebhookSignature', () => {
    it('should generate a valid HMAC-SHA256 signature', () => {
      const signature = generateWebhookSignature(mockPayload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should generate consistent signatures for the same payload', () => {
      const sig1 = generateWebhookSignature(mockPayload, secret);
      const sig2 = generateWebhookSignature(mockPayload, secret);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const payload2: WebhookPayload = {
        ...mockPayload,
        data: { ...mockPayload.data, operationId: 'different-id' },
      };

      const sig1 = generateWebhookSignature(mockPayload, secret);
      const sig2 = generateWebhookSignature(payload2, secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const sig1 = generateWebhookSignature(mockPayload, secret);
      const sig2 = generateWebhookSignature(mockPayload, 'different-secret');

      expect(sig1).not.toBe(sig2);
    });

    it('should match expected signature format (Base64)', () => {
      const signature = generateWebhookSignature(mockPayload, secret);
      const base64Regex = /^[A-Za-z0-9+/=]+$/;

      expect(signature).toMatch(base64Regex);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify a valid signature', () => {
      const signature = generateWebhookSignature(mockPayload, secret);
      const isValid = verifyWebhookSignature(mockPayload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const wrongSignature = 'invalid-signature-abc123';
      const isValid = verifyWebhookSignature(mockPayload, wrongSignature, secret);

      expect(isValid).toBe(false);
    });

    it('should reject a signature with wrong secret', () => {
      const signature = generateWebhookSignature(mockPayload, secret);
      const isValid = verifyWebhookSignature(mockPayload, signature, 'wrong-secret');

      expect(isValid).toBe(false);
    });

    it('should reject a signature for tampered payload', () => {
      const signature = generateWebhookSignature(mockPayload, secret);
      const tamperedPayload = {
        ...mockPayload,
        data: { ...mockPayload.data, status: 'failed' as const },
      };
      const isValid = verifyWebhookSignature(tamperedPayload, signature, secret);

      expect(isValid).toBe(false);
    });

    it('should handle signature with different length gracefully', () => {
      const shortSignature = 'short';
      const isValid = verifyWebhookSignature(mockPayload, shortSignature, secret);

      expect(isValid).toBe(false);
    });
  });

  describe('validateWebhookUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      const urls = [
        'https://example.com/webhook',
        'https://api.example.com/webhooks/video',
        'https://subdomain.example.co.uk/api/webhook',
      ];

      urls.forEach((url) => {
        expect(validateWebhookUrl(url)).toBe(true);
      });
    });

    it('should reject HTTP URLs in production', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      const httpUrl = 'http://example.com/webhook';
      expect(validateWebhookUrl(httpUrl)).toBe(false);

      process.env['NODE_ENV'] = originalEnv;
    });

    it('should accept HTTP URLs in development', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';

      const httpUrl = 'http://localhost:3000/webhook';
      expect(validateWebhookUrl(httpUrl)).toBe(true);

      process.env['NODE_ENV'] = originalEnv;
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/webhook',
        'example.com/webhook',
        '',
        'javascript:alert(1)',
      ];

      invalidUrls.forEach((url) => {
        expect(validateWebhookUrl(url)).toBe(false);
      });
    });

    it('should reject URLs without host', () => {
      const urlWithoutHost = 'https:///webhook';
      expect(validateWebhookUrl(urlWithoutHost)).toBe(false);
    });
  });

  describe('deliverWebhook', () => {
    const webhookUrl = 'https://example.com/webhook';

    beforeEach(() => {
      // Reset fetch mock before each test
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should deliver webhook successfully on first attempt', async () => {
      const mockResponse = new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should include correct headers in webhook request', async () => {
      const mockResponse = new Response(JSON.stringify({ received: true }), {
        status: 200,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String),
            'X-Webhook-Event': mockPayload.event,
            'User-Agent': 'NonLinearEditor-Webhook/1.0',
          }),
          body: JSON.stringify(mockPayload),
        })
      );
    });

    it('should retry on server error (5xx)', async () => {
      const serverError = new Response('Server Error', { status: 500 });
      const successResponse = new Response(JSON.stringify({ received: true }), {
        status: 200,
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(serverError)
        .mockResolvedValueOnce(successResponse);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        maxRetries: 3,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client error (4xx except 408, 429)', async () => {
      const clientError = new Response('Bad Request', { status: 400 });

      (global.fetch as jest.Mock).mockResolvedValueOnce(clientError);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        maxRetries: 3,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.statusCode).toBe(400);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 (rate limit)', async () => {
      const rateLimitError = new Response('Too Many Requests', { status: 429 });
      const successResponse = new Response(JSON.stringify({ received: true }), {
        status: 200,
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        maxRetries: 3,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should retry on timeout', async () => {
      const timeoutError = new Response('Request Timeout', { status: 408 });
      const successResponse = new Response(JSON.stringify({ received: true }), {
        status: 200,
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(timeoutError)
        .mockResolvedValueOnce(successResponse);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        maxRetries: 3,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network request failed');
      const successResponse = new Response(JSON.stringify({ received: true }), {
        status: 200,
      });

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        maxRetries: 3,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should fail after max retries', async () => {
      const serverError = new Response('Server Error', { status: 500 });

      (global.fetch as jest.Mock).mockResolvedValue(serverError);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        maxRetries: 3,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should respect custom timeout', async () => {
      const mockResponse = new Response(JSON.stringify({ received: true }), {
        status: 200,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        timeout: 5000, // 5 seconds
      });

      expect(result.success).toBe(true);
    });

    it('should handle abort on timeout', async () => {
      // Simulate a request that never completes
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(new Response('OK', { status: 200 })), 60000);
          })
      );

      const result = await deliverWebhook({
        url: webhookUrl,
        payload: mockPayload,
        secret,
        timeout: 100, // 100ms timeout
        maxRetries: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Webhook Payload Types', () => {
    it('should accept valid completed video payload', () => {
      const payload: WebhookPayload = {
        event: 'video.generation.completed',
        timestamp: new Date().toISOString(),
        data: {
          operationId: 'op-123',
          userId: 'user-456',
          projectId: 'proj-789',
          status: 'completed',
          result: {
            assetId: 'asset-abc',
            storageUrl: 'supabase://assets/video.mp4',
            metadata: {
              model: 'veo-3.1',
              duration: 5,
            },
          },
        },
      };

      expect(payload.event).toBe('video.generation.completed');
      expect(payload.data.status).toBe('completed');
      expect(payload.data.result?.assetId).toBe('asset-abc');
    });

    it('should accept valid failed audio payload', () => {
      const payload: WebhookPayload = {
        event: 'audio.generation.failed',
        timestamp: new Date().toISOString(),
        data: {
          operationId: 'op-123',
          userId: 'user-456',
          projectId: 'proj-789',
          status: 'failed',
          error: 'Generation timeout',
        },
      };

      expect(payload.event).toBe('audio.generation.failed');
      expect(payload.data.status).toBe('failed');
      expect(payload.data.error).toBe('Generation timeout');
    });
  });
});
