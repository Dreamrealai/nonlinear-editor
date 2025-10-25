/**
 * Tests for Video Generation Utilities
 *
 * @module __tests__/lib/utils/videoGenerationUtils.test
 */

import {
  canAddToQueue,
  createVideoQueueItem,
  updateQueueItemStatus,
  removeFromQueue,
  filterCompletedItems,
  validateVideoGenerationForm,
  adjustFormStateForModel,
  parseSeedValue,
  buildVideoGenerationRequest,
  hasCompletedItems,
  type VideoQueueItemData,
  type VideoGenerationFormState,
} from '@/lib/utils/videoGenerationUtils';
import { NUMERIC_LIMITS } from '@/lib/config';
import { VIDEO_MODEL_CONFIGS } from '@/lib/config/models';

// Mock config
jest.mock('@/lib/config', (): Record<string, unknown> => ({
  NUMERIC_LIMITS: {
    VIDEO_QUEUE_MAX: 3,
  },
}));

jest.mock('@/lib/config/models', (): Record<string, unknown> => ({
  VIDEO_MODEL_CONFIGS: {
    'veo-002': {
      supportedAspectRatios: ['16:9', '9:16', '1:1'],
      supportedDurations: [5, 8],
      maxSampleCount: 2,
      supportsAudio: true,
      supportsNegativePrompt: true,
      supportsEnhancePrompt: true,
    },
    'minimax-01': {
      supportedAspectRatios: ['16:9', '9:16'],
      supportedDurations: [5, 6],
      maxSampleCount: 1,
      supportsAudio: false,
      supportsNegativePrompt: false,
      supportsEnhancePrompt: false,
    },
  },
}));

describe('canAddToQueue', () => {
  it('should allow adding when queue is empty', () => {
    expect(canAddToQueue(0)).toBe(true);
  });

  it('should allow adding when queue is below limit', () => {
    expect(canAddToQueue(1)).toBe(true);
    expect(canAddToQueue(2)).toBe(true);
  });

  it('should not allow adding when queue is at limit', () => {
    expect(canAddToQueue(3)).toBe(false);
  });

  it('should not allow adding when queue exceeds limit', () => {
    expect(canAddToQueue(4)).toBe(false);
    expect(canAddToQueue(10)).toBe(false);
  });
});

describe('createVideoQueueItem', () => {
  beforeEach((): void => {
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('should create queue item with correct structure', () => {
    const prompt = 'Test video prompt';
    const item = createVideoQueueItem(prompt);

    expect(item).toMatchObject({
      prompt,
      operationName: null,
      status: 'queued',
      createdAt: 1234567890,
    });
  });

  it('should generate unique ID', () => {
    const item = createVideoQueueItem('test');

    expect(item.id).toBeDefined();
    expect(item.id).toContain('video-');
    expect(item.id).toBe('video-1234567890');
  });

  it('should initialize with queued status', () => {
    const item = createVideoQueueItem('test');

    expect(item.status).toBe('queued');
  });

  it('should handle empty prompt', () => {
    const item = createVideoQueueItem('');

    expect(item.prompt).toBe('');
  });

  it('should include createdAt timestamp', () => {
    const item = createVideoQueueItem('test');

    expect(item.createdAt).toBe(1234567890);
  });
});

describe('updateQueueItemStatus', () => {
  const mockQueue: VideoQueueItemData[] = [
    {
      id: 'video-1',
      prompt: 'First video',
      operationName: null,
      status: 'queued',
      createdAt: 1000,
    },
    {
      id: 'video-2',
      prompt: 'Second video',
      operationName: null,
      status: 'generating',
      createdAt: 2000,
    },
  ];

  it('should update matching item', () => {
    const updated = updateQueueItemStatus(mockQueue, 'video-1', {
      status: 'generating',
      operationName: 'op-123',
    });

    expect(updated[0]).toMatchObject({
      id: 'video-1',
      status: 'generating',
      operationName: 'op-123',
    });
    expect(updated[1]).toEqual(mockQueue[1]);
  });

  it('should not modify other items', () => {
    const updated = updateQueueItemStatus(mockQueue, 'video-1', {
      status: 'completed',
      videoUrl: 'https://example.com/video.mp4',
    });

    expect(updated[1]).toEqual(mockQueue[1]);
  });

  it('should handle non-existent ID', () => {
    const updated = updateQueueItemStatus(mockQueue, 'non-existent', {
      status: 'completed',
    });

    expect(updated).toEqual(mockQueue);
  });

  it('should support partial updates', () => {
    const updated = updateQueueItemStatus(mockQueue, 'video-2', {
      videoUrl: 'https://example.com/video.mp4',
    });

    expect(updated[1]).toMatchObject({
      id: 'video-2',
      status: 'generating',
      videoUrl: 'https://example.com/video.mp4',
    });
  });

  it('should return new array', () => {
    const updated = updateQueueItemStatus(mockQueue, 'video-1', {
      status: 'completed',
    });

    expect(updated).not.toBe(mockQueue);
  });
});

describe('removeFromQueue', () => {
  const mockQueue: VideoQueueItemData[] = [
    {
      id: 'video-1',
      prompt: 'First',
      operationName: null,
      status: 'queued',
      createdAt: 1000,
    },
    {
      id: 'video-2',
      prompt: 'Second',
      operationName: null,
      status: 'generating',
      createdAt: 2000,
    },
    {
      id: 'video-3',
      prompt: 'Third',
      operationName: null,
      status: 'completed',
      createdAt: 3000,
    },
  ];

  it('should remove item by ID', () => {
    const filtered = removeFromQueue(mockQueue, 'video-2');

    expect(filtered).toHaveLength(2);
    expect(filtered.find((item) => item.id === 'video-2')).toBeUndefined();
  });

  it('should keep other items', () => {
    const filtered = removeFromQueue(mockQueue, 'video-2');

    expect(filtered.find((item) => item.id === 'video-1')).toBeDefined();
    expect(filtered.find((item) => item.id === 'video-3')).toBeDefined();
  });

  it('should handle non-existent ID', () => {
    const filtered = removeFromQueue(mockQueue, 'non-existent');

    expect(filtered).toEqual(mockQueue);
  });

  it('should handle empty queue', () => {
    const filtered = removeFromQueue([], 'video-1');

    expect(filtered).toEqual([]);
  });
});

describe('filterCompletedItems', () => {
  const mockQueue: VideoQueueItemData[] = [
    {
      id: 'video-1',
      prompt: 'First',
      operationName: null,
      status: 'queued',
      createdAt: 1000,
    },
    {
      id: 'video-2',
      prompt: 'Second',
      operationName: null,
      status: 'completed',
      createdAt: 2000,
    },
    {
      id: 'video-3',
      prompt: 'Third',
      operationName: null,
      status: 'generating',
      createdAt: 3000,
    },
    {
      id: 'video-4',
      prompt: 'Fourth',
      operationName: null,
      status: 'failed',
      createdAt: 4000,
    },
  ];

  it('should remove completed items', () => {
    const filtered = filterCompletedItems(mockQueue);

    expect(filtered.find((item) => item.status === 'completed')).toBeUndefined();
  });

  it('should remove failed items', () => {
    const filtered = filterCompletedItems(mockQueue);

    expect(filtered.find((item) => item.status === 'failed')).toBeUndefined();
  });

  it('should keep queued and generating items', () => {
    const filtered = filterCompletedItems(mockQueue);

    expect(filtered).toHaveLength(2);
    expect(filtered.find((item) => item.id === 'video-1')).toBeDefined();
    expect(filtered.find((item) => item.id === 'video-3')).toBeDefined();
  });

  it('should handle empty queue', () => {
    const filtered = filterCompletedItems([]);

    expect(filtered).toEqual([]);
  });

  it('should handle all completed', () => {
    const allCompleted: VideoQueueItemData[] = [
      {
        id: 'video-1',
        prompt: 'First',
        operationName: null,
        status: 'completed',
        createdAt: 1000,
      },
      {
        id: 'video-2',
        prompt: 'Second',
        operationName: null,
        status: 'failed',
        createdAt: 2000,
      },
    ];

    const filtered = filterCompletedItems(allCompleted);

    expect(filtered).toEqual([]);
  });
});

describe('validateVideoGenerationForm', () => {
  it('should validate valid prompt with space in queue', () => {
    const result = validateVideoGenerationForm('Test prompt', 2);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty prompt', () => {
    const result = validateVideoGenerationForm('', 0);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a prompt');
  });

  it('should reject whitespace-only prompt', () => {
    const result = validateVideoGenerationForm('   ', 0);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a prompt');
  });

  it('should reject when queue is full', () => {
    const result = validateVideoGenerationForm('Test prompt', 3);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum');
    expect(result.error).toContain('3');
  });

  it('should accept prompt with leading/trailing spaces', () => {
    const result = validateVideoGenerationForm('  Test prompt  ', 0);

    expect(result.valid).toBe(true);
  });
});

describe('adjustFormStateForModel', () => {
  const baseFormState: VideoGenerationFormState = {
    prompt: 'Test',
    model: 'veo-002',
    aspectRatio: '16:9',
    duration: 5,
    resolution: '1080p',
    negativePrompt: 'bad quality',
    personGeneration: 'allow_adult',
    enhancePrompt: true,
    generateAudio: true,
    seed: '',
    sampleCount: 2,
  };

  it('should adjust unsupported aspect ratio', () => {
    const formState = { ...baseFormState, aspectRatio: '4:3' as const };
    const updates = adjustFormStateForModel('minimax-01', formState);

    expect(updates.aspectRatio).toBe('16:9');
  });

  it('should adjust unsupported duration', () => {
    const formState = { ...baseFormState, duration: 10 as const };
    const updates = adjustFormStateForModel('minimax-01', formState);

    expect(updates.duration).toBe(5);
  });

  it('should adjust sample count when exceeds max', () => {
    const formState = { ...baseFormState, sampleCount: 2 as const };
    const updates = adjustFormStateForModel('minimax-01', formState);

    expect(updates.sampleCount).toBe(1);
  });

  it('should clear audio when not supported', () => {
    const formState = { ...baseFormState, generateAudio: true };
    const updates = adjustFormStateForModel('minimax-01', formState);

    expect(updates.generateAudio).toBe(false);
  });

  it('should clear negative prompt when not supported', () => {
    const formState = { ...baseFormState, negativePrompt: 'test' };
    const updates = adjustFormStateForModel('minimax-01', formState);

    expect(updates.negativePrompt).toBe('');
  });

  it('should clear enhance prompt when not supported', () => {
    const formState = { ...baseFormState, enhancePrompt: true };
    const updates = adjustFormStateForModel('minimax-01', formState);

    expect(updates.enhancePrompt).toBe(false);
  });

  it('should return empty object for invalid model', () => {
    const updates = adjustFormStateForModel('invalid-model', baseFormState);

    expect(updates).toEqual({});
  });

  it('should not modify when all settings supported', () => {
    const updates = adjustFormStateForModel('veo-002', baseFormState);

    expect(Object.keys(updates).length).toBe(0);
  });
});

describe('parseSeedValue', () => {
  it('should parse valid integer', () => {
    expect(parseSeedValue('123')).toBe(123);
    expect(parseSeedValue('0')).toBe(0);
    expect(parseSeedValue('999999')).toBe(999999);
  });

  it('should handle empty string', () => {
    expect(parseSeedValue('')).toBeUndefined();
  });

  it('should handle whitespace', () => {
    expect(parseSeedValue('  ')).toBeUndefined();
    expect(parseSeedValue('  123  ')).toBe(123);
  });

  it('should handle invalid numbers', () => {
    expect(parseSeedValue('abc')).toBeUndefined();
    expect(parseSeedValue('12.34')).toBe(12);
    expect(parseSeedValue('not a number')).toBeUndefined();
  });

  it('should handle negative numbers', () => {
    expect(parseSeedValue('-123')).toBe(-123);
  });
});

describe('buildVideoGenerationRequest', () => {
  const formState: VideoGenerationFormState = {
    prompt: 'A beautiful sunset',
    model: 'veo-002',
    aspectRatio: '16:9',
    duration: 5,
    resolution: '1080p',
    negativePrompt: 'low quality',
    personGeneration: 'allow_adult',
    enhancePrompt: true,
    generateAudio: true,
    seed: '12345',
    sampleCount: 2,
  };

  it('should build complete request', () => {
    const request = buildVideoGenerationRequest('proj-123', formState);

    expect(request).toMatchObject({
      projectId: 'proj-123',
      prompt: 'A beautiful sunset',
      model: 'veo-002',
      aspectRatio: '16:9',
      duration: 5,
      resolution: '1080p',
      negativePrompt: 'low quality',
      personGeneration: 'allow_adult',
      enhancePrompt: true,
      generateAudio: true,
      seed: 12345,
      sampleCount: 2,
    });
  });

  it('should include image asset ID when provided', () => {
    const request = buildVideoGenerationRequest('proj-123', formState, 'img-456');

    expect(request.imageAssetId).toBe('img-456');
  });

  it('should exclude undefined values', () => {
    const minimalFormState = {
      ...formState,
      negativePrompt: '',
      seed: '',
    };

    const request = buildVideoGenerationRequest('proj-123', minimalFormState);

    expect(request.negativePrompt).toBeUndefined();
    expect(request.seed).toBeUndefined();
  });

  it('should trim whitespace from negative prompt', () => {
    const formStateWithSpaces = {
      ...formState,
      negativePrompt: '  test prompt  ',
    };

    const request = buildVideoGenerationRequest('proj-123', formStateWithSpaces);

    expect(request.negativePrompt).toBe('test prompt');
  });

  it('should exclude image asset ID when not provided', () => {
    const request = buildVideoGenerationRequest('proj-123', formState);

    expect(request.imageAssetId).toBeUndefined();
  });
});

describe('hasCompletedItems', () => {
  it('should return true when queue has completed items', () => {
    const queue: VideoQueueItemData[] = [
      {
        id: 'video-1',
        prompt: 'Test',
        operationName: null,
        status: 'completed',
        createdAt: 1000,
      },
    ];

    expect(hasCompletedItems(queue)).toBe(true);
  });

  it('should return true when queue has failed items', () => {
    const queue: VideoQueueItemData[] = [
      {
        id: 'video-1',
        prompt: 'Test',
        operationName: null,
        status: 'failed',
        createdAt: 1000,
      },
    ];

    expect(hasCompletedItems(queue)).toBe(true);
  });

  it('should return false when queue has only active items', () => {
    const queue: VideoQueueItemData[] = [
      {
        id: 'video-1',
        prompt: 'Test',
        operationName: null,
        status: 'queued',
        createdAt: 1000,
      },
      {
        id: 'video-2',
        prompt: 'Test',
        operationName: null,
        status: 'generating',
        createdAt: 2000,
      },
    ];

    expect(hasCompletedItems(queue)).toBe(false);
  });

  it('should return false for empty queue', () => {
    expect(hasCompletedItems([])).toBe(false);
  });

  it('should return true when mixed statuses', () => {
    const queue: VideoQueueItemData[] = [
      {
        id: 'video-1',
        prompt: 'Test',
        operationName: null,
        status: 'queued',
        createdAt: 1000,
      },
      {
        id: 'video-2',
        prompt: 'Test',
        operationName: null,
        status: 'completed',
        createdAt: 2000,
      },
    ];

    expect(hasCompletedItems(queue)).toBe(true);
  });
});
