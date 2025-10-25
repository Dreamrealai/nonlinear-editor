/**
 * Tests for Navigation Utilities
 */

import { redirectToUrl } from '@/lib/navigation';

describe('Navigation', () => {
  describe('redirectToUrl', () => {
    let originalWindow: typeof global.window;
    let originalLocation: Location;

    beforeEach((): void => {
      originalWindow = global.window;
      originalLocation = window.location;

      // Mock window.location
      delete (window as { location?: unknown }).location;
      window.location = { href: '' } as Location;
    });

    afterEach((): void => {
      window.location = originalLocation;
      global.window = originalWindow;
    });

    it('should redirect to URL', () => {
      // Act
      redirectToUrl('https://example.com');

      // Assert
      expect(window.location.href).toBe('https://example.com');
    });

    it('should redirect to relative URL', () => {
      // Act
      redirectToUrl('/dashboard');

      // Assert
      expect(window.location.href).toBe('/dashboard');
    });

    it('should not redirect when URL is empty', () => {
      // Arrange
      window.location.href = 'https://current.com';

      // Act
      redirectToUrl('');

      // Assert
      expect(window.location.href).toBe('https://current.com');
    });

    it('should handle undefined URL', () => {
      // Arrange
      window.location.href = 'https://current.com';

      // Act
      redirectToUrl(undefined as unknown as string);

      // Assert
      expect(window.location.href).toBe('https://current.com');
    });
  });
});
