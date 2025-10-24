/**
 * Video Generation Utilities
 *
 * Shared utilities for video generation functionality.
 * De-duplicates validation, format conversion, and helper functions.
 */

import { VIDEO_MODEL_CONFIGS } from '@/lib/config/models';
import { NUMERIC_LIMITS } from '@/lib/config';

export interface VideoQueueItemData {
  id: string;
  prompt: string;
  operationName: string | null;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: number;
}

export interface ImageAsset {
  id: string;
  storage_url: string;
  metadata?: {
    thumbnail?: string;
  };
  created_at: string;
}

export interface VideoGenerationFormState {
  prompt: string;
  model: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  duration: 4 | 5 | 6 | 8 | 10;
  resolution: '720p' | '1080p';
  negativePrompt: string;
  personGeneration: 'allow_adult' | 'dont_allow';
  enhancePrompt: boolean;
  generateAudio: boolean;
  seed: string;
  sampleCount: 1 | 2 | 3 | 4;
}

/**
 * Validate if a video queue can accept new items
 */
export function canAddToQueue(queueLength: number): boolean {
  return queueLength < NUMERIC_LIMITS.VIDEO_QUEUE_MAX;
}

/**
 * Create a new video queue item
 */
export function createVideoQueueItem(prompt: string): VideoQueueItemData {
  return {
    id: `video-${Date.now()}`,
    prompt,
    operationName: null,
    status: 'queued',
    createdAt: Date.now(),
  };
}

/**
 * Update queue item status
 */
export function updateQueueItemStatus(
  queue: VideoQueueItemData[],
  videoId: string,
  updates: Partial<VideoQueueItemData>
): VideoQueueItemData[] {
  return queue.map((item): VideoQueueItemData => (item.id === videoId ? { ...item, ...updates } : item));
}

/**
 * Remove item from queue
 */
export function removeFromQueue(
  queue: VideoQueueItemData[],
  videoId: string
): VideoQueueItemData[] {
  return queue.filter((item): boolean => item.id !== videoId);
}

/**
 * Filter completed and failed items from queue
 */
export function filterCompletedItems(queue: VideoQueueItemData[]): VideoQueueItemData[] {
  return queue.filter((item): boolean => item.status !== 'completed' && item.status !== 'failed');
}

/**
 * Validate form state before submission
 */
export function validateVideoGenerationForm(
  prompt: string,
  queueLength: number
): { valid: boolean; error?: string } {
  if (!prompt.trim()) {
    return { valid: false, error: 'Please enter a prompt' };
  }

  if (!canAddToQueue(queueLength)) {
    return {
      valid: false,
      error: `Maximum ${NUMERIC_LIMITS.VIDEO_QUEUE_MAX} videos in queue. Please wait for some to complete.`,
    };
  }

  return { valid: true };
}

/**
 * Validate and adjust form state when model changes
 */
export function adjustFormStateForModel(
  newModel: string,
  currentState: VideoGenerationFormState
): Partial<VideoGenerationFormState> {
  const newConfig = VIDEO_MODEL_CONFIGS[newModel];
  if (!newConfig) return {};

  const updates: Partial<VideoGenerationFormState> = {};

  // Adjust aspect ratio if not supported
  if (!newConfig.supportedAspectRatios.includes(currentState.aspectRatio)) {
    updates.aspectRatio = newConfig.supportedAspectRatios[0] as
      | '16:9'
      | '9:16'
      | '1:1'
      | '4:3'
      | '3:4';
  }

  // Adjust duration if not supported
  if (!newConfig.supportedDurations.includes(currentState.duration)) {
    updates.duration = newConfig.supportedDurations[0];
  }

  // Adjust sample count if exceeds max
  if (currentState.sampleCount > newConfig.maxSampleCount) {
    updates.sampleCount = 1;
  }

  // Clear settings not supported by new model
  if (!newConfig.supportsAudio) {
    updates.generateAudio = false;
  }

  if (!newConfig.supportsNegativePrompt) {
    updates.negativePrompt = '';
  }

  if (!newConfig.supportsEnhancePrompt) {
    updates.enhancePrompt = false;
  }

  return updates;
}

/**
 * Parse seed value from string input
 */
export function parseSeedValue(seedStr: string): number | undefined {
  const trimmed = seedStr.trim();
  if (!trimmed) return undefined;

  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed)) return undefined;

  return parsed;
}

/**
 * Build API request body for video generation
 */
export function buildVideoGenerationRequest(
  projectId: string,
  formState: VideoGenerationFormState,
  imageAssetId?: string
): Record<string, unknown> {
  return {
    projectId,
    prompt: formState.prompt,
    model: formState.model,
    aspectRatio: formState.aspectRatio,
    duration: formState.duration,
    resolution: formState.resolution,
    negativePrompt: formState.negativePrompt.trim() || undefined,
    personGeneration: formState.personGeneration,
    enhancePrompt: formState.enhancePrompt,
    generateAudio: formState.generateAudio,
    seed: parseSeedValue(formState.seed),
    sampleCount: formState.sampleCount,
    imageAssetId: imageAssetId || undefined,
  };
}

/**
 * Check if queue has items that can be cleared
 */
export function hasCompletedItems(queue: VideoQueueItemData[]): boolean {
  return queue.some((item): boolean => item.status === 'completed' || item.status === 'failed');
}
