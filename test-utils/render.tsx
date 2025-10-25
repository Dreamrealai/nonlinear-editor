/**
 * Custom Render Function with Providers
 *
 * Wraps React Testing Library's render with commonly needed providers:
 * - Router context (Next.js navigation mocks)
 * - Supabase client context
 * - Theme providers (if needed)
 *
 * @example
 * ```tsx
 * import { render, screen } from '@/test-utils';
 *
 * test('renders component', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 *
 * // With custom options
 * test('renders with authenticated user', () => {
 *   const mockSupabase = createMockSupabaseClient();
 *   mockAuthenticatedUser(mockSupabase, { email: 'user@example.com' });
 *
 *   render(<MyComponent />, {
 *     mockSupabase,
 *     routerProps: { pathname: '/dashboard' }
 *   });
 * });
 * ```
 */

import React, { ReactElement, ReactNode } from 'react';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  RenderOptions,
  RenderHookOptions,
} from '@testing-library/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { MockSupabaseChain } from './mockSupabase';

/**
 * Mock router props
 */
export interface MockRouterProps {
  pathname?: string;
  query?: Record<string, string | string[]>;
  asPath?: string;
  push?: jest.Mock;
  replace?: jest.Mock;
  refresh?: jest.Mock;
  back?: jest.Mock;
  forward?: jest.Mock;
  prefetch?: jest.Mock;
}

/**
 * Custom render options
 */
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Mock Supabase client to provide to components
   */
  mockSupabase?: MockSupabaseChain;

  /**
   * Mock router props for Next.js navigation
   */
  routerProps?: MockRouterProps;

  /**
   * Additional wrapper components
   */
  wrapper?: React.ComponentType<{ children: ReactNode }>;

  /**
   * Initial route (for routing tests)
   */
  initialRoute?: string;
}

/**
 * Custom renderHook options
 */
export interface CustomRenderHookOptions<TProps>
  extends Omit<RenderHookOptions<TProps>, 'wrapper'> {
  mockSupabase?: MockSupabaseChain;
  routerProps?: MockRouterProps;
  wrapper?: React.ComponentType<{ children: ReactNode }>;
}

/**
 * Creates a wrapper component with all necessary providers
 */
function createWrapper(options: CustomRenderOptions = {}): React.ComponentType<{ children: ReactNode }> {
  const { routerProps, wrapper: CustomWrapper } = options;

  // Setup router mocks
  if (routerProps) {
    const {
      pathname = '/',
      query = {},
      asPath = '/',
      push = jest.fn(),
      replace = jest.fn(),
      refresh = jest.fn(),
      back = jest.fn(),
      forward = jest.fn(),
      prefetch = jest.fn(),
    } = routerProps;

    // Mock useRouter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.mocked(useRouter).mockReturnValue({
      push,
      replace,
      refresh,
      back,
      forward,
      prefetch,
      pathname,
      query,
      asPath,
    } as unknown as ReturnType<typeof useRouter>); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Mock usePathname
    jest.mocked(usePathname).mockReturnValue(pathname);

    // Mock useSearchParams
    const searchParams = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ])
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.mocked(useSearchParams).mockReturnValue(searchParams as any);
  }

  // Create AllTheProviders wrapper
  const AllTheProviders = ({ children }: { children: ReactNode }): JSX.Element => {
    let wrappedChildren = children;

    // Add Supabase provider if mockSupabase is provided
    // Note: In real app, you'd wrap with SupabaseProvider here
    // For now, we rely on mocking at the import level

    // Add custom wrapper if provided
    if (CustomWrapper) {
      wrappedChildren = <CustomWrapper>{wrappedChildren}</CustomWrapper>;
    }

    return <>{wrappedChildren}</>;
  };

  return AllTheProviders;
}

/**
 * Custom render function with providers
 */
export function render(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof rtlRender> {
  const { mockSupabase, routerProps, wrapper, ...renderOptions } = options;

  // If mockSupabase is provided, set it globally for the test
  if (mockSupabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__TEST_SUPABASE_CLIENT__ = mockSupabase;
  }

  const Wrapper = createWrapper({ mockSupabase, routerProps, wrapper });

  return rtlRender(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });
}

/**
 * Custom renderHook function with providers
 */
export function renderHook<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {}
): ReturnType<typeof rtlRenderHook<TResult, TProps>> {
  const { mockSupabase, routerProps, wrapper, ...renderOptions } = options;

  // If mockSupabase is provided, set it globally for the test
  if (mockSupabase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__TEST_SUPABASE_CLIENT__ = mockSupabase;
  }

  const Wrapper = createWrapper({ mockSupabase, routerProps, wrapper });

  return rtlRenderHook(hook, {
    wrapper: Wrapper,
    ...renderOptions,
  });
}

/**
 * Wait for an element to be removed from the DOM
 * Re-exported from @testing-library/react for convenience
 */
export { waitFor, waitForElementToBeRemoved } from '@testing-library/react';

/**
 * Screen utility for querying
 * Re-exported from @testing-library/react for convenience
 */
export { screen } from '@testing-library/react';

/**
 * Within utility for scoped queries
 * Re-exported from @testing-library/react for convenience
 */
export { within } from '@testing-library/react';
