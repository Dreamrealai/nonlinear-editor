/**
 * @jest-environment jsdom
 */
import { cloneTimeline, cloneClip, cloneClips } from '@/lib/utils/cloneUtils';
import type { Timeline, Clip } from '@/types/timeline';
import { browserLogger } from '@/lib/browserLogger';

jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    debug: jest.fn(),
  },
}));

describe('Clone Utils', () => {
  const mockClip: Clip = {
    id: 'clip-1',
    assetId: 'asset-1',
    start: 0,
    duration: 5000,
    timelinePosition: 1000,
    track: 'video',
    trackIndex: 0,
    type: 'video',
  };

  const mockTimeline: Timeline = {
    id: 'timeline-1',
    projectId: 'project-1',
    clips: [mockClip],
    duration: 10000,
    playhead: 0,
    zoom: 1,
    scrollX: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cloneTimeline', () => {
    it('should return null when timeline is null', () => {
      // Act
      const result = cloneTimeline(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should deep clone a timeline', () => {
      // Act
      const result = cloneTimeline(mockTimeline);

      // Assert
      expect(result).toEqual(mockTimeline);
      expect(result).not.toBe(mockTimeline);
      expect(result?.clips).not.toBe(mockTimeline.clips);
      expect(result?.clips[0]).not.toBe(mockTimeline.clips[0]);
    });

    it('should use fallback when structuredClone fails', () => {
      // Arrange - Create timeline with non-cloneable property
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      // Set NODE_ENV to development to trigger logging
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Act
      const result = cloneTimeline(mockTimeline);

      // Assert
      expect(result).toEqual(mockTimeline);
      expect(result).not.toBe(mockTimeline);
      expect(browserLogger.debug).toHaveBeenCalled();

      // Cleanup
      global.structuredClone = originalStructuredClone;
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production when using fallback', () => {
      // Arrange
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Act
      const result = cloneTimeline(mockTimeline);

      // Assert
      expect(result).toEqual(mockTimeline);
      expect(browserLogger.debug).not.toHaveBeenCalled();

      // Cleanup
      global.structuredClone = originalStructuredClone;
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle nested objects', () => {
      // Arrange
      const complexTimeline = {
        ...mockTimeline,
        metadata: {
          title: 'My Video',
          tags: ['tag1', 'tag2'],
          settings: {
            resolution: { width: 1920, height: 1080 },
            fps: 30,
          },
        },
      };

      // Act
      const result = cloneTimeline(complexTimeline as Timeline);

      // Assert
      expect(result).toEqual(complexTimeline);
      expect(result).not.toBe(complexTimeline);
    });
  });

  describe('cloneClip', () => {
    it('should deep clone a clip', () => {
      // Act
      const result = cloneClip(mockClip);

      // Assert
      expect(result).toEqual(mockClip);
      expect(result).not.toBe(mockClip);
    });

    it('should use fallback when structuredClone fails', () => {
      // Arrange
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Act
      const result = cloneClip(mockClip);

      // Assert
      expect(result).toEqual(mockClip);
      expect(result).not.toBe(mockClip);
      expect(browserLogger.debug).toHaveBeenCalled();

      // Cleanup
      global.structuredClone = originalStructuredClone;
      process.env.NODE_ENV = originalEnv;
    });

    it('should filter out function properties in fallback', () => {
      // Arrange
      const clipWithFunction = {
        ...mockClip,
        onUpdate: () => console.log('update'),
      } as any;

      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      // Act
      const result = cloneClip(clipWithFunction);

      // Assert
      expect(result).not.toHaveProperty('onUpdate');
      expect(result.id).toBe(mockClip.id);

      // Cleanup
      global.structuredClone = originalStructuredClone;
    });
  });

  describe('cloneClips', () => {
    it('should deep clone an array of clips', () => {
      // Arrange
      const clips = [mockClip, { ...mockClip, id: 'clip-2' }];

      // Act
      const result = cloneClips(clips);

      // Assert
      expect(result).toEqual(clips);
      expect(result).not.toBe(clips);
      expect(result[0]).not.toBe(clips[0]);
      expect(result[1]).not.toBe(clips[1]);
    });

    it('should use fallback when structuredClone fails', () => {
      // Arrange
      const clips = [mockClip];
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Act
      const result = cloneClips(clips);

      // Assert
      expect(result).toEqual(clips);
      expect(result).not.toBe(clips);
      expect(browserLogger.debug).toHaveBeenCalled();

      // Cleanup
      global.structuredClone = originalStructuredClone;
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle empty array', () => {
      // Act
      const result = cloneClips([]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('deepClone edge cases', () => {
    it('should handle Date objects', () => {
      // Arrange
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const timeline = {
        ...mockTimeline,
        createdAt: new Date('2025-01-01'),
      } as any;

      // Act
      const result = cloneTimeline(timeline);

      // Assert
      expect(result.createdAt).toEqual(new Date('2025-01-01'));
      expect(result.createdAt).not.toBe(timeline.createdAt);

      // Cleanup
      global.structuredClone = originalStructuredClone;
    });

    it('should handle Set objects', () => {
      // Arrange
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const timeline = {
        ...mockTimeline,
        tags: new Set(['tag1', 'tag2']),
      } as any;

      // Act
      const result = cloneTimeline(timeline);

      // Assert
      expect(result.tags).toEqual(new Set(['tag1', 'tag2']));
      expect(result.tags).not.toBe(timeline.tags);

      // Cleanup
      global.structuredClone = originalStructuredClone;
    });

    it('should handle Map objects', () => {
      // Arrange
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const timeline = {
        ...mockTimeline,
        metadata: map,
      } as any;

      // Act
      const result = cloneTimeline(timeline);

      // Assert
      expect(result.metadata).toEqual(map);
      expect(result.metadata).not.toBe(map);

      // Cleanup
      global.structuredClone = originalStructuredClone;
    });

    it('should filter out undefined properties', () => {
      // Arrange
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const timeline = {
        ...mockTimeline,
        someUndefined: undefined,
      } as any;

      // Act
      const result = cloneTimeline(timeline);

      // Assert
      expect(result).not.toHaveProperty('someUndefined');

      // Cleanup
      global.structuredClone = originalStructuredClone;
    });

    it('should filter out symbol properties', () => {
      // Arrange
      const originalStructuredClone = global.structuredClone;
      global.structuredClone = jest.fn(() => {
        throw new Error('DataCloneError');
      });

      const sym = Symbol('test');
      const timeline = {
        ...mockTimeline,
        [sym]: 'value',
      } as any;

      // Act
      const result = cloneTimeline(timeline);

      // Assert
      expect(result[sym]).toBeUndefined();

      // Cleanup
      global.structuredClone = originalStructuredClone;
    });
  });
});
