/**
 * Navigation utilities for handling client-side redirects in a testable way.
 */

export function redirectToUrl(url: string): void {
  if (typeof window !== 'undefined' && url) {
    window.location.href = url;
  }
}
