/**
 * Tests for GET /api/health - Health Check Endpoint
 */

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  describe('Success Cases', () => {
    it('should return healthy status with metadata', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('version');
    });

    it('should return valid ISO timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeTruthy();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('should return numeric uptime', async () => {
      const response = await GET();
      const data = await response.json();

      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return current environment', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeTruthy();
      expect(typeof data.environment).toBe('string');
    });
  });

  describe('Response Format', () => {
    it('should return JSON content type', async () => {
      const response = await GET();

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });

    it('should have all required fields', async () => {
      const response = await GET();
      const data = await response.json();

      const requiredFields = ['status', 'timestamp', 'uptime', 'environment', 'version'];
      requiredFields.forEach((field) => {
        expect(data).toHaveProperty(field);
      });
    });
  });
});
