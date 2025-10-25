/**
 * Tests for SentryService
 *
 * Tests all error tracking functionality including:
 * - Error capturing with context
 * - Message capturing
 * - Breadcrumb tracking
 * - User context management
 * - Tag and context setting
 * - Performance span tracking
 * - Context clearing
 * - Configuration checking
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import {
  sentryService,
  isSentryConfigured,
  type ErrorContext,
  type BreadcrumbData,
  type UserContext,
} from '@/lib/services/sentryService';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry SDK
jest.mock(
  '@sentry/nextjs',
  () => ({
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    setContext: jest.fn(),
    startSpan: jest.fn((options, callback) => callback()),
    withScope: jest.fn((callback) => {
      const scope = {
        setUser: jest.fn(),
        setTag: jest.fn(),
        setContext: jest.fn(),
        setLevel: jest.fn(),
      };
      callback(scope);
    }),
  })
);

// Helper function to get fresh module imports (fixes Sentry mock scope issues)
async function getModules() {
  const { sentryService, isSentryConfigured } = await import('@/lib/services/sentryService');
  const Sentry = await import('@sentry/nextjs');
  return { sentryService, isSentryConfigured, Sentry };
}

describe('SentryService', () => {
  let originalEnv: string | undefined;

  beforeAll((): void => {
    originalEnv = process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterAll((): void => {
    if (originalEnv) {
      process.env.NEXT_PUBLIC_SENTRY_DSN = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    }
  });

  beforeEach((): void => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example@sentry.io/123456';
  });

  describe('isSentryConfigured', () => {
    it('should return true when DSN is configured', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example@sentry.io/123456';

      // Act
      const result = isSentryConfigured();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when DSN is not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      // Act
      const result = isSentryConfigured();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when DSN is empty string', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SENTRY_DSN = '';

      // Act
      const result = isSentryConfigured();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('captureError', () => {
    it('should capture Error object with context', async () => {
      // Arrange
      jest.resetModules(); // Reset modules to ensure mocks are properly applied
      const { sentryService, Sentry } = await getModules();
      const error = new Error('Test error');
      const context: ErrorContext = {
        userId: 'user-123',
        projectId: 'project-456',
        action: 'video_generation',
        metadata: { model: 'veo-3.1' },
      };

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture non-Error object as string', async () => {
      // Arrange
      jest.resetModules(); // Reset modules to ensure mocks are properly applied
      const { sentryService, Sentry } = await getModules();
      const error = 'Simple string error';
      const context: ErrorContext = {
        userId: 'user-123',
      };

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(new Error('Simple string error'));
    });

    it('should set user context when userId provided', () => {
      // Arrange
      const error = new Error('Test error');
      const context: ErrorContext = {
        userId: 'user-123',
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(capturedScope.setUser).toHaveBeenCalledWith({ id: 'user-123' });
    });

    it('should set custom tags when provided', () => {
      // Arrange
      const error = new Error('Test error');
      const context: ErrorContext = {
        tags: {
          environment: 'production',
          feature: 'video-generation',
        },
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(capturedScope.setTag).toHaveBeenCalledWith('environment', 'production');
      expect(capturedScope.setTag).toHaveBeenCalledWith('feature', 'video-generation');
    });

    it('should set action tag when provided', () => {
      // Arrange
      const error = new Error('Test error');
      const context: ErrorContext = {
        action: 'video_generation',
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(capturedScope.setTag).toHaveBeenCalledWith('action', 'video_generation');
    });

    it('should set project context when projectId provided', () => {
      // Arrange
      const error = new Error('Test error');
      const context: ErrorContext = {
        projectId: 'project-456',
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(capturedScope.setContext).toHaveBeenCalledWith('project', { id: 'project-456' });
    });

    it('should set asset context when assetId provided', () => {
      // Arrange
      const error = new Error('Test error');
      const context: ErrorContext = {
        assetId: 'asset-789',
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(capturedScope.setContext).toHaveBeenCalledWith('asset', { id: 'asset-789' });
    });

    it('should set metadata context when provided', () => {
      // Arrange
      const error = new Error('Test error');
      const context: ErrorContext = {
        metadata: {
          model: 'veo-3.1',
          duration: 5,
          resolution: '1080p',
        },
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureError(error, context);

      // Assert
      expect(capturedScope.setContext).toHaveBeenCalledWith('metadata', {
        model: 'veo-3.1',
        duration: 5,
        resolution: '1080p',
      });
    });

    it('should not capture when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const error = new Error('Test error');

      // Act
      sentryService.captureError(error);

      // Assert
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should handle error capture without context', async () => {
      // Arrange
      jest.resetModules(); // Reset modules to ensure mocks are properly applied
      const { sentryService, Sentry } = await getModules();
      const error = new Error('Test error');

      // Act
      sentryService.captureError(error);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe('captureMessage', () => {
    it('should capture message with default level', async () => {
      // Arrange
      jest.resetModules(); // Reset modules to ensure mocks are properly applied
      const { sentryService, Sentry } = await getModules();
      const message = 'Test message';

      // Act
      sentryService.captureMessage(message);

      // Assert
      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, 'info');
    });

    it('should capture message with custom level', async () => {
      // Arrange
      jest.resetModules(); // Reset modules to ensure mocks are properly applied
      const { sentryService, Sentry } = await getModules();
      const message = 'Test error message';

      // Act
      sentryService.captureMessage(message, 'error');

      // Assert
      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, 'error');
    });

    it('should set user context when provided', () => {
      // Arrange
      const message = 'Test message';
      const context: ErrorContext = {
        userId: 'user-123',
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
          setLevel: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureMessage(message, 'info', context);

      // Assert
      expect(capturedScope.setUser).toHaveBeenCalledWith({ id: 'user-123' });
      expect(capturedScope.setLevel).toHaveBeenCalledWith('info');
    });

    it('should set custom tags when provided', () => {
      // Arrange
      const message = 'Test message';
      const context: ErrorContext = {
        tags: {
          feature: 'analytics',
        },
      };

      let capturedScope: any;
      (Sentry.withScope as jest.Mock).mockImplementationOnce((callback) => {
        const scope = {
          setUser: jest.fn(),
          setTag: jest.fn(),
          setContext: jest.fn(),
          setLevel: jest.fn(),
        };
        capturedScope = scope;
        callback(scope);
      });

      // Act
      sentryService.captureMessage(message, 'warning', context);

      // Assert
      expect(capturedScope.setTag).toHaveBeenCalledWith('feature', 'analytics');
    });

    it('should not capture when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const message = 'Test message';

      // Act
      sentryService.captureMessage(message);

      // Assert
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('should handle all severity levels', async () => {
      // Arrange & Act & Assert
      jest.resetModules(); // Reset modules to ensure mocks are properly applied
      const { sentryService, Sentry } = await getModules();
      sentryService.captureMessage('Fatal error', 'fatal');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Fatal error', 'fatal');

      sentryService.captureMessage('Error message', 'error');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Error message', 'error');

      sentryService.captureMessage('Warning message', 'warning');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Warning message', 'warning');

      sentryService.captureMessage('Info message', 'info');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Info message', 'info');

      sentryService.captureMessage('Debug message', 'debug');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Debug message', 'debug');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb with all fields', () => {
      // Arrange
      const breadcrumb: BreadcrumbData = {
        message: 'User clicked export button',
        category: 'user-action',
        level: 'info',
        data: { button: 'export', project: 'project-123' },
      };

      // Act
      sentryService.addBreadcrumb(breadcrumb);

      // Assert
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User clicked export button',
        category: 'user-action',
        level: 'info',
        data: { button: 'export', project: 'project-123' },
        timestamp: expect.any(Number),
      });
    });

    it('should use default category when not provided', () => {
      // Arrange
      const breadcrumb: BreadcrumbData = {
        message: 'Test breadcrumb',
      };

      // Act
      sentryService.addBreadcrumb(breadcrumb);

      // Assert
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'custom',
        level: 'info',
        data: undefined,
        timestamp: expect.any(Number),
      });
    });

    it('should use default level when not provided', () => {
      // Arrange
      const breadcrumb: BreadcrumbData = {
        message: 'Test breadcrumb',
        category: 'navigation',
      };

      // Act
      sentryService.addBreadcrumb(breadcrumb);

      // Assert
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'navigation',
        level: 'info',
        data: undefined,
        timestamp: expect.any(Number),
      });
    });

    it('should not add breadcrumb when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const breadcrumb: BreadcrumbData = {
        message: 'Test breadcrumb',
      };

      // Act
      sentryService.addBreadcrumb(breadcrumb);

      // Assert
      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('setUser', () => {
    it('should set user with all fields', () => {
      // Arrange
      const user: UserContext = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        ip_address: '192.168.1.1',
        subscription: 'pro',
      };

      // Act
      sentryService.setUser(user);

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        ip_address: '192.168.1.1',
        subscription: 'pro',
      });
    });

    it('should set user with minimal fields', () => {
      // Arrange
      const user: UserContext = {
        id: 'user-123',
      };

      // Act
      sentryService.setUser(user);

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-123',
        email: undefined,
        username: undefined,
        ip_address: undefined,
        subscription: undefined,
      });
    });

    it('should clear user context when null provided', () => {
      // Arrange & Act
      sentryService.setUser(null);

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should not set user when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const user: UserContext = {
        id: 'user-123',
      };

      // Act
      sentryService.setUser(user);

      // Assert
      expect(Sentry.setUser).not.toHaveBeenCalled();
    });
  });

  describe('setTag', () => {
    it('should set custom tag', () => {
      // Arrange & Act
      sentryService.setTag('environment', 'production');

      // Assert
      expect(Sentry.setTag).toHaveBeenCalledWith('environment', 'production');
    });

    it('should not set tag when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      // Act
      sentryService.setTag('environment', 'production');

      // Assert
      expect(Sentry.setTag).not.toHaveBeenCalled();
    });
  });

  describe('setContext', () => {
    it('should set custom context with data', () => {
      // Arrange
      const contextData = {
        page: 'timeline',
        action: 'editing',
        clipCount: 15,
      };

      // Act
      sentryService.setContext('editor', contextData);

      // Assert
      expect(Sentry.setContext).toHaveBeenCalledWith('editor', contextData);
    });

    it('should clear context when null provided', () => {
      // Arrange & Act
      sentryService.setContext('editor', null);

      // Assert
      expect(Sentry.setContext).toHaveBeenCalledWith('editor', null);
    });

    it('should not set context when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const contextData = { page: 'timeline' };

      // Act
      sentryService.setContext('editor', contextData);

      // Assert
      expect(Sentry.setContext).not.toHaveBeenCalled();
    });
  });

  describe('startSpan', () => {
    it('should start performance span and execute callback', () => {
      // Arrange
      const callback = jest.fn(() => 'result');
      (Sentry.startSpan as jest.Mock).mockImplementationOnce((options, cb) => cb());

      // Act
      const result = sentryService.startSpan('video-generation', 'task', callback);

      // Assert
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        {
          name: 'video-generation',
          op: 'task',
        },
        callback
      );
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should execute callback without tracing when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      const callback = jest.fn(() => 'result');

      // Act
      const result = sentryService.startSpan('video-generation', 'task', callback);

      // Assert
      expect(Sentry.startSpan).not.toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should handle async callbacks', () => {
      // Arrange
      const callback = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async-result';
      });

      (Sentry.startSpan as jest.Mock).mockImplementationOnce((options, cb) => cb());

      // Act
      const result = sentryService.startSpan('async-task', 'http', callback);

      // Assert
      expect(callback).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('clearContext', () => {
    it('should clear all contexts', () => {
      // Arrange & Act
      sentryService.clearContext();

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
      expect(Sentry.setContext).toHaveBeenCalledWith('user', null);
      expect(Sentry.setContext).toHaveBeenCalledWith('project', null);
      expect(Sentry.setContext).toHaveBeenCalledWith('asset', null);
      expect(Sentry.setContext).toHaveBeenCalledWith('metadata', null);
    });

    it('should not clear context when Sentry not configured', () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      // Act
      sentryService.clearContext();

      // Assert
      expect(Sentry.setUser).not.toHaveBeenCalled();
      expect(Sentry.setContext).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should support complete error tracking workflow', async () => {
      // Arrange
      jest.resetModules(); // Reset modules to ensure mocks are properly applied
      const { sentryService, Sentry } = await getModules();
      const user: UserContext = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const error = new Error('Video generation failed');
      const context: ErrorContext = {
        userId: 'user-123',
        projectId: 'project-456',
        action: 'video_generation',
        metadata: {
          model: 'veo-3.1',
          prompt: 'A beautiful sunset',
        },
        tags: {
          feature: 'ai-generation',
        },
      };

      // Act
      sentryService.setUser(user);
      sentryService.addBreadcrumb({
        message: 'Started video generation',
        category: 'ai',
        level: 'info',
      });
      sentryService.captureError(error, context);

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-123' }));
      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should support logout workflow', () => {
      // Arrange
      sentryService.setUser({
        id: 'user-123',
        email: 'test@example.com',
      });

      // Act
      sentryService.clearContext();

      // Assert
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
      expect(Sentry.setContext).toHaveBeenCalledTimes(4); // user, project, asset, metadata
    });
  });
});
