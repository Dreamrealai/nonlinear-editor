/**
 * Tests for POST /api/auth/signout - Sign Out Endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/signout/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock the Supabase module
jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
  isSupabaseConfigured: jest.fn(() => true),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';

describe('POST /api/auth/signout', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach((): void => {
    // Clear all mock calls BEFORE setting up new mocks
    jest.clearAllMocks();

    // Create and configure mock Supabase client
    mockSupabase = createMockSupabaseClient();
    (createServerSupabaseClient as jest.Mock).mockResolvedValue(mockSupabase);
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    // Create mock request with valid origin
    mockRequest = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
      },
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
  });

  describe('Success Cases', () => {
    it('should sign out authenticated user successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should sign out even if user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should log sign out event', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      await POST(mockRequest);

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.signout.success',
          userId: mockUser.id,
        }),
        expect.any(String)
      );
    });
  });

  describe('CSRF Protection', () => {
    it('should reject request with invalid origin', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: {
          origin: 'https://malicious-site.com',
        },
      });

      const response = await POST(invalidRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Invalid origin');
      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.signout.csrf_blocked',
        }),
        expect.any(String)
      );
    });

    it('should allow request from localhost:3000', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should allow request from localhost:3001', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should allow request with no origin header', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Configuration Errors', () => {
    it('should return 500 when Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Supabase not configured');
      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.signout.config_error',
        }),
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when sign out fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Failed to sign out', name: 'AuthError' },
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to sign out');
      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.signout.error',
        }),
        expect.any(String)
      );
    });
  });

  describe('Logging', () => {
    it('should log request start', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockAuthenticatedUser(mockSupabase);

      await POST(mockRequest);

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.signout.request_started',
        }),
        expect.any(String)
      );
    });

    it('should log duration in success event', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      const mockUser = mockAuthenticatedUser(mockSupabase);

      await POST(mockRequest);

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth.signout.success',
          userId: mockUser.id,
          duration: expect.any(Number),
        }),
        expect.any(String)
      );
    });
  });
});
