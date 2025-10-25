/**
 * React Hook Test Template
 *
 * Use this template for testing custom React hooks.
 * Replace TODO comments with your actual test logic.
 *
 * @example
 * Copy this file to your test directory:
 * cp test-utils/templates/hook.template.test.tsx __tests__/hooks/useMyHook.test.tsx
 */

import {
  renderHook,
  waitFor,
  act,
  createMockSupabaseClient,
  mockAuthenticatedUser,
} from '@/test-utils';

// TODO: Import your hook
// import { useMyHook } from '@/hooks/useMyHook';

describe('TODO: Hook Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default values', () => {
    // Act
    // TODO: Render hook
    // const { result } = renderHook(() => useMyHook());
    // Assert
    // TODO: Check initial state
    // expect(result.current.data).toBeNull();
    // expect(result.current.isLoading).toBe(false);
    // expect(result.current.error).toBeNull();
  });

  it('initializes with custom options', () => {
    // Arrange
    const options = {
      // TODO: Add custom options
    };

    // Act
    // TODO: Render hook with options
    // const { result } = renderHook(() => useMyHook(options));

    // Assert
    // TODO: Verify custom initialization
  });

  it('fetches data successfully', async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockAuthenticatedUser(mockSupabase);

    const mockData = {
      id: '1',
      name: 'Test Data',
    };

    mockSupabase.mockResolvedValue({
      data: mockData,
      error: null,
    });

    // Act
    // TODO: Render hook with mock Supabase
    // const { result } = renderHook(() => useMyHook(), {
    //   mockSupabase,
    // });

    // Wait for data to load
    await waitFor(() => {
      // TODO: Wait for loading to finish
      // expect(result.current.isLoading).toBe(false);
    });

    // Assert
    // TODO: Verify data
    // expect(result.current.data).toEqual(mockData);
    // expect(result.current.error).toBeNull();
  });

  it('handles errors', async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockAuthenticatedUser(mockSupabase);

    mockSupabase.mockResolvedValue({
      data: null,
      error: { message: 'Failed to load data' },
    });

    // Act
    // TODO: Render hook
    // const { result } = renderHook(() => useMyHook(), {
    //   mockSupabase,
    // });

    // Wait for error
    await waitFor(() => {
      // TODO: Wait for error state
      // expect(result.current.error).toBeTruthy();
    });

    // Assert
    // TODO: Verify error state
    // expect(result.current.data).toBeNull();
    // expect(result.current.error).toBe('Failed to load data');
  });

  it('refetches data on demand', async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockAuthenticatedUser(mockSupabase);

    mockSupabase.mockResolvedValue({
      data: { id: '1' },
      error: null,
    });

    // TODO: Render hook
    // const { result } = renderHook(() => useMyHook(), {
    //   mockSupabase,
    // });

    await waitFor(() => {
      // expect(result.current.isLoading).toBe(false);
    });

    // Act - refetch
    // TODO: Call refetch function
    // act(() => {
    //   result.current.refetch();
    // });

    // Assert
    // TODO: Verify refetch
    // expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });

  it('updates state when parameters change', async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockAuthenticatedUser(mockSupabase);

    mockSupabase.mockResolvedValue({
      data: { id: '1' },
      error: null,
    });

    // TODO: Render hook with initial params
    // const { result, rerender } = renderHook(
    //   ({ id }) => useMyHook(id),
    //   {
    //     initialProps: { id: '1' },
    //     mockSupabase,
    //   }
    // );

    await waitFor(() => {
      // expect(result.current.isLoading).toBe(false);
    });

    // Act - change params
    mockSupabase.mockResolvedValue({
      data: { id: '2' },
      error: null,
    });

    // TODO: Rerender with new params
    // rerender({ id: '2' });

    await waitFor(() => {
      // expect(result.current.data.id).toBe('2');
    });
  });

  it('cleans up on unmount', () => {
    // TODO: Render hook
    // const { unmount } = renderHook(() => useMyHook());
    // Act
    // TODO: Unmount hook
    // unmount();
    // Assert
    // TODO: Verify cleanup
    // (e.g., subscriptions cancelled, timers cleared, etc.)
  });

  it('handles rapid updates correctly', async () => {
    // TODO: Test rapid state changes
    // Ensure hook doesn't have race conditions
  });

  it('memoizes expensive computations', () => {
    // TODO: Test memoization
    // Verify expensive functions aren't called unnecessarily
  });

  it('works with custom dependencies', () => {
    // TODO: Test with different dependency arrays
  });

  describe('actions', () => {
    it('executes action successfully', async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient();
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.mockResolvedValue({
        data: { id: 'new-id' },
        error: null,
      });

      // TODO: Render hook
      // const { result } = renderHook(() => useMyHook(), {
      //   mockSupabase,
      // });

      // Act
      // TODO: Execute action
      // await act(async () => {
      //   await result.current.createItem({ name: 'Test' });
      // });

      // Assert
      // TODO: Verify action result
      // expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('handles action errors', async () => {
      // TODO: Test action error handling
    });

    it('updates state after action', async () => {
      // TODO: Verify state updates after actions
    });
  });

  // TODO: Add additional tests
  // - Edge cases
  // - Loading states
  // - Optimistic updates
  // - Real-time subscriptions
  // - Debouncing/throttling
});
