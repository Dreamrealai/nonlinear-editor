/**
 * API Route Test Template
 *
 * Use this template for testing Next.js API routes.
 * Replace TODO comments with your actual test logic.
 *
 * @example
 * Copy this file to your test directory:
 * cp test-utils/templates/api-route.template.test.ts __tests__/api/my-route.test.ts
 */

import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  type MockSupabaseChain,
} from '@/test-utils';

// TODO: Import your API route handlers
// import { GET, POST, PUT, DELETE } from '@/app/api/your-route/route';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: require('@/test-utils/mockWithAuth').mockWithAuth,
}));

describe('TODO: API Route Name', () => {
  let mockSupabase: MockSupabaseChain;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns data for authenticated user', async () => {
      // Arrange
      const user = mockAuthenticatedUser(mockSupabase, {
        id: 'user-123',
        email: 'test@example.com',
      });

      // TODO: Configure mock database response
      mockSupabase.mockResolvedValue({
        data: [{ id: '1', title: 'Test Item' }],
        error: null,
        count: 1,
      });

      // TODO: Create request
      const request = new NextRequest('http://localhost:3000/api/your-route');

      // Act
      // TODO: Call your handler
      // const response = await GET(request);

      // Assert
      // TODO: Add assertions
      // expect(response.status).toBe(200);
      // const data = await response.json();
      // expect(data).toHaveLength(1);
      // expect(data[0].title).toBe('Test Item');
    });

    it('returns 401 for unauthenticated user', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // TODO: Create request
      const request = new NextRequest('http://localhost:3000/api/your-route');

      // Act
      // TODO: Call your handler
      // const response = await GET(request);

      // Assert
      // TODO: Add assertions
      // expect(response.status).toBe(401);
    });

    it('returns 500 on database error', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      // TODO: Create request
      const request = new NextRequest('http://localhost:3000/api/your-route');

      // Act
      // TODO: Call your handler
      // const response = await GET(request);

      // Assert
      // TODO: Add assertions
      // expect(response.status).toBe(500);
    });
  });

  describe('POST', () => {
    it('creates new item for authenticated user', async () => {
      // Arrange
      const user = mockAuthenticatedUser(mockSupabase);

      // TODO: Configure mock database response
      mockSupabase.mockResolvedValue({
        data: { id: 'new-id', title: 'New Item' },
        error: null,
      });

      // TODO: Create request with body
      const request = new NextRequest('http://localhost:3000/api/your-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Item' }),
      });

      // Act
      // TODO: Call your handler
      // const response = await POST(request);

      // Assert
      // TODO: Add assertions
      // expect(response.status).toBe(201);
      // const data = await response.json();
      // expect(data.id).toBe('new-id');
      // expect(mockSupabase.from).toHaveBeenCalledWith('your_table');
      // expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('returns 400 for invalid input', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase);

      // TODO: Create request with invalid body
      const request = new NextRequest('http://localhost:3000/api/your-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          /* invalid data */
        }),
      });

      // Act
      // TODO: Call your handler
      // const response = await POST(request);

      // Assert
      // TODO: Add assertions
      // expect(response.status).toBe(400);
    });
  });

  describe('PUT', () => {
    it('updates existing item', async () => {
      // TODO: Add PUT tests
    });
  });

  describe('DELETE', () => {
    it('deletes item', async () => {
      // TODO: Add DELETE tests
    });

    it('returns 404 for non-existent item', async () => {
      // TODO: Add 404 test
    });
  });

  // TODO: Add additional test cases as needed
  // - Rate limiting
  // - Input validation
  // - Edge cases
  // - Error scenarios
});
