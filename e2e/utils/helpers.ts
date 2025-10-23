import type { Page } from '@playwright/test';

/**
 * Wait for an element to be visible and return it
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  return page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for network to be idle (useful after actions that trigger API calls)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Fill form field and wait for it to update
 */
export async function fillFormField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  await page.waitForTimeout(100); // Small delay to ensure input is processed
}

/**
 * Click button and wait for navigation or network response
 */
export async function clickAndWait(page: Page, selector: string, waitFor: 'navigation' | 'networkidle' = 'networkidle') {
  if (waitFor === 'navigation') {
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click(selector),
    ]);
  } else {
    await page.click(selector);
    await waitForNetworkIdle(page);
  }
}

/**
 * Wait for toast notification to appear with specific text
 */
export async function waitForToast(page: Page, text: string, timeout = 5000) {
  return page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * Check if element is visible
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique test identifier
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Mock API response for testing
 */
export async function mockAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  responseData: any,
  status = 200
) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(responseData),
    });
  });
}
