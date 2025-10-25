/**
 * Component Test Helpers
 *
 * @deprecated This legacy component helper module is deprecated.
 * Please migrate to modern utilities:
 * - `renderWithProviders()` → Use `render()` from `/test-utils/render.tsx`
 * - `waitForLoadingToFinish()` → Use `waitFor()` from `@testing-library/react`
 * - `setupUserEvent()` → Use `userEvent` from `@testing-library/user-event`
 * - `createMockRouter()` → Available in `/test-utils/testHelpers.ts`
 *
 * **Migration:**
 * ```typescript
 * // OLD:
 * import { renderWithProviders } from '@/test-utils/legacy-helpers/components';
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * // NEW:
 * import { render, screen } from '@/test-utils';
 * render(<MyComponent />);
 * const element = screen.getByText('Hello');
 * ```
 *
 * **Migration Guide:** See `/docs/TESTING_UTILITIES.md` section "Component Testing"
 * **Issue:** #83
 *
 * Utilities for testing React components with Testing Library.
 * Provides helpers for rendering with providers, waiting for states,
 * setting up user interactions, and common component patterns.
 *
 * @module __tests__/helpers/components
 * @example
 * ```typescript
 * // DEPRECATED:
 * import { renderWithProviders } from '@/test-utils/legacy-helpers/components';
 *
 * // NEW:
 * import { render, screen } from '@/test-utils';
 * ```
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Options for rendering components with providers.
 */
export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for router
   */
  route?: string;

  /**
   * Mock router configuration
   */
  router?: Partial<any>;

  /**
   * Additional wrapper components
   */
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Renders a component with common providers (Router, etc.).
 *
 * This is a wrapper around Testing Library's render that automatically
 * sets up providers commonly needed in tests.
 *
 * @param component - The component to render
 * @param options - Optional render configuration
 * @returns Render result with utilities
 *
 * @example
 * ```typescript
 * const { getByText, user } = renderWithProviders(
 *   <MyComponent />,
 *   { route: '/editor/123' }
 * );
 *
 * await user.click(getByText('Submit'));
 * ```
 */
export function renderWithProviders(
  component: ReactElement,
  options?: RenderWithProvidersOptions
): RenderResult & { user: UserEvent } {
  const { route = '/', router = {}, wrapper, ...renderOptions } = options || {};

  // Setup user event
  const user = userEvent.setup();

  // Create wrapper if provided
  const Wrapper = wrapper
    ? ({ children }: { children: React.ReactNode }) => {
        const CustomWrapper = wrapper;
        return <CustomWrapper>{children}</CustomWrapper>;
      }
    : undefined;

  const result = render(component, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  return {
    ...result,
    user,
  };
}

/**
 * Waits for loading states to finish.
 *
 * Looks for common loading indicators and waits for them to disappear.
 *
 * @param options - Optional waitFor options
 *
 * @example
 * ```typescript
 * renderWithProviders(<MyComponent />);
 * await waitForLoadingToFinish();
 * expect(screen.getByText('Content')).toBeInTheDocument();
 * ```
 */
export async function waitForLoadingToFinish(options?: { timeout?: number }): Promise<void> {
  const { timeout = 5000 } = options || {};

  await waitFor(
    () => {
      // Check for common loading indicators
      const loadingTexts = ['Loading...', 'Please wait...', 'Processing...'];
      const hasLoading = loadingTexts.some((text) => {
        try {
          return document.body.textContent?.includes(text);
        } catch {
          return false;
        }
      });

      expect(hasLoading).toBe(false);
    },
    { timeout }
  );
}

/**
 * Creates a mock Next.js router.
 *
 * @param overrides - Optional router properties to override
 * @returns Mock router object
 *
 * @example
 * ```typescript
 * const mockRouter = createMockRouter({
 *   pathname: '/editor/123',
 *   query: { id: '123' }
 * });
 *
 * jest.mock('next/navigation', () => ({
 *   useRouter: () => mockRouter
 * }));
 * ```
 */
export function createMockRouter(overrides?: Partial<any>): any {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    ...overrides,
  };
}

/**
 * Sets up user event with default options.
 *
 * @param options - Optional user event options
 * @returns UserEvent instance
 *
 * @example
 * ```typescript
 * const user = setupUserEvent();
 * await user.click(button);
 * await user.type(input, 'Hello');
 * ```
 */
export function setupUserEvent(options?: Parameters<typeof userEvent.setup>[0]): UserEvent {
  return userEvent.setup(options);
}

/**
 * Waits for an element to appear and returns it.
 *
 * @param getElement - Function to get the element
 * @param options - Optional wait options
 * @returns The element
 *
 * @example
 * ```typescript
 * const button = await waitForElement(
 *   () => screen.getByRole('button', { name: 'Submit' })
 * );
 * ```
 */
export async function waitForElement<T>(
  getElement: () => T,
  options?: { timeout?: number }
): Promise<T> {
  const { timeout = 3000 } = options || {};
  let element: T;

  await waitFor(
    () => {
      element = getElement();
      expect(element).toBeTruthy();
    },
    { timeout }
  );

  return element!;
}

/**
 * Waits for an element to disappear.
 *
 * @param getElement - Function that should throw when element is gone
 * @param options - Optional wait options
 *
 * @example
 * ```typescript
 * await waitForElementToDisappear(
 *   () => screen.getByText('Loading...')
 * );
 * ```
 */
export async function waitForElementToDisappear(
  getElement: () => any,
  options?: { timeout?: number }
): Promise<void> {
  const { timeout = 3000 } = options || {};

  await waitFor(
    () => {
      expect(() => getElement()).toThrow();
    },
    { timeout }
  );
}

/**
 * Fills a form with values.
 *
 * @param user - UserEvent instance
 * @param fields - Object mapping field names to values
 *
 * @example
 * ```typescript
 * const user = setupUserEvent();
 * await fillForm(user, {
 *   email: 'test@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export async function fillForm(user: UserEvent, fields: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const input = document.querySelector(`[name="${name}"]`) as HTMLElement;
    if (!input) {
      throw new Error(`Could not find input with name "${name}"`);
    }
    await user.clear(input);
    await user.type(input, value);
  }
}

/**
 * Clicks a button by its text.
 *
 * @param user - UserEvent instance
 * @param buttonText - Button text or regex
 * @returns Promise that resolves when click completes
 *
 * @example
 * ```typescript
 * const user = setupUserEvent();
 * await clickButton(user, 'Submit');
 * ```
 */
export async function clickButton(user: UserEvent, buttonText: string | RegExp): Promise<void> {
  const button = document.querySelector(`button:contains("${buttonText}")`) as HTMLElement;

  if (!button) {
    // Fallback to finding by role and name
    const buttons = Array.from(document.querySelectorAll('button'));
    const foundButton = buttons.find((btn) => {
      const text = btn.textContent || '';
      return typeof buttonText === 'string' ? text.includes(buttonText) : buttonText.test(text);
    });

    if (!foundButton) {
      throw new Error(`Could not find button with text "${buttonText}"`);
    }

    await user.click(foundButton);
  } else {
    await user.click(button);
  }
}

/**
 * Submits a form.
 *
 * @param user - UserEvent instance
 * @param form - Form element or selector
 *
 * @example
 * ```typescript
 * const user = setupUserEvent();
 * await submitForm(user, 'form[name="login"]');
 * ```
 */
export async function submitForm(user: UserEvent, form: HTMLFormElement | string): Promise<void> {
  const formElement =
    typeof form === 'string' ? (document.querySelector(form) as HTMLFormElement) : form;

  if (!formElement) {
    throw new Error(`Could not find form: ${form}`);
  }

  const submitButton = formElement.querySelector('[type="submit"]') as HTMLElement;
  if (submitButton) {
    await user.click(submitButton);
  } else {
    // Simulate form submission
    formElement.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

/**
 * Waits for a specific number of milliseconds.
 *
 * @param ms - Milliseconds to wait
 *
 * @example
 * ```typescript
 * await wait(1000); // Wait 1 second
 * ```
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Expects an element to have specific CSS classes.
 *
 * @param element - The element to check
 * @param classes - Expected class names
 *
 * @example
 * ```typescript
 * const button = screen.getByRole('button');
 * expectToHaveClasses(button, 'bg-blue-500', 'text-white');
 * ```
 */
export function expectToHaveClasses(element: HTMLElement, ...classes: string[]): void {
  classes.forEach((className) => {
    expect(element).toHaveClass(className);
  });
}

/**
 * Expects an element to be visible and enabled.
 *
 * @param element - The element to check
 *
 * @example
 * ```typescript
 * const button = screen.getByRole('button');
 * expectToBeInteractive(button);
 * ```
 */
export function expectToBeInteractive(element: HTMLElement): void {
  expect(element).toBeVisible();
  expect(element).toBeEnabled();
}

/**
 * Expects an element to be disabled.
 *
 * @param element - The element to check
 *
 * @example
 * ```typescript
 * const button = screen.getByRole('button');
 * expectToBeDisabled(button);
 * ```
 */
export function expectToBeDisabled(element: HTMLElement): void {
  expect(element).toBeDisabled();
}

/**
 * Expects text content to match.
 *
 * @param element - The element to check
 * @param text - Expected text or pattern
 *
 * @example
 * ```typescript
 * expectTextContent(heading, 'Welcome');
 * expectTextContent(paragraph, /hello/i);
 * ```
 */
export function expectTextContent(element: HTMLElement, text: string | RegExp): void {
  if (typeof text === 'string') {
    expect(element).toHaveTextContent(text);
  } else {
    expect(element.textContent).toMatch(text);
  }
}

/**
 * Gets all error messages from the page.
 *
 * @returns Array of error message elements
 *
 * @example
 * ```typescript
 * const errors = getErrorMessages();
 * expect(errors).toHaveLength(1);
 * expect(errors[0]).toHaveTextContent('Invalid input');
 * ```
 */
export function getErrorMessages(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[role="alert"], .error, [class*="error"]'));
}

/**
 * Expects no error messages on the page.
 *
 * @example
 * ```typescript
 * await submitForm(user, form);
 * expectNoErrors();
 * ```
 */
export function expectNoErrors(): void {
  const errors = getErrorMessages();
  expect(errors).toHaveLength(0);
}

/**
 * Expects specific error message to be present.
 *
 * @param message - Expected error message or pattern
 *
 * @example
 * ```typescript
 * expectErrorMessage('Password is required');
 * expectErrorMessage(/required/i);
 * ```
 */
export function expectErrorMessage(message: string | RegExp): void {
  const errors = getErrorMessages();
  const found = errors.some((error) => {
    const text = error.textContent || '';
    return typeof message === 'string' ? text.includes(message) : message.test(text);
  });

  expect(found).toBe(true);
}

/**
 * Mocks window.alert.
 *
 * @returns Mock function
 *
 * @example
 * ```typescript
 * const alertMock = mockAlert();
 * // ... trigger alert
 * expect(alertMock).toHaveBeenCalledWith('Success!');
 * ```
 */
export function mockAlert(): jest.Mock {
  const mock = jest.fn();
  global.alert = mock;
  return mock;
}

/**
 * Mocks window.confirm.
 *
 * @param returnValue - What confirm should return (default: true)
 * @returns Mock function
 *
 * @example
 * ```typescript
 * const confirmMock = mockConfirm(true);
 * // ... trigger confirm
 * expect(confirmMock).toHaveBeenCalled();
 * ```
 */
export function mockConfirm(returnValue: boolean = true): jest.Mock {
  const mock = jest.fn().mockReturnValue(returnValue);
  global.confirm = mock;
  return mock;
}

/**
 * Mocks window.prompt.
 *
 * @param returnValue - What prompt should return
 * @returns Mock function
 *
 * @example
 * ```typescript
 * const promptMock = mockPrompt('User input');
 * // ... trigger prompt
 * expect(promptMock).toHaveBeenCalled();
 * ```
 */
export function mockPrompt(returnValue: string | null = null): jest.Mock {
  const mock = jest.fn().mockReturnValue(returnValue);
  global.prompt = mock;
  return mock;
}
