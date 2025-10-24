/**
 * FAL.ai Video Generation API Integration
 *
 * This module provides functions to generate videos using various models on fal.ai:
 * - Seedance 1.0 Pro (ByteDance)
 * - MiniMax Hailuo-02 Pro (Hailuo AI)
 *
 * Required Environment Variables:
 * - FAL_API_KEY: API key for fal.ai
 */

import { API_ENDPOINTS, FAL_ENDPOINTS, TIMEOUTS } from './config/api';
import { VIDEO_MODELS } from './config/models';

/**
 * Parameters for FAL video generation request.
 */
export interface FalVideoParams {
  /** Text prompt describing the video to generate */
  prompt: string;
  /** Model to use for generation */
  model: string;
  /** Aspect ratio for the generated video */
  aspectRatio?: '16:9' | '9:16' | '1:1';
  /** Duration in seconds */
  duration?: number;
  /** Resolution (seedance only: 480p, 720p, 1080p) */
  resolution?: '480p' | '720p' | '1080p';
  /** URL of reference image for image-to-video generation */
  imageUrl?: string;
  /** Enable prompt optimizer (minimax only) */
  promptOptimizer?: boolean;
}

/**
 * Result from FAL video generation.
 */
export interface FalVideoResult {
  /** Generated video data */
  video: {
    /** URL of the generated video */
    url: string;
    /** Content type */
    content_type?: string;
    /** File name */
    file_name?: string;
    /** File size in bytes */
    file_size?: number;
  };
}

/**
 * Get FAL API key from environment.
 */
function getFalApiKey(): string {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw new Error('FAL_API_KEY environment variable is required');
  }
  return apiKey;
}

/**
 * Get the appropriate FAL endpoint based on model and whether image is provided.
 */
function getFalEndpoint(model: string, hasImage: boolean): string {
  const endpointMap: Record<string, { text: string; image: string }> = {
    [VIDEO_MODELS.SEEDANCE_1_0_PRO]: {
      text: FAL_ENDPOINTS.SEEDANCE_TEXT_TO_VIDEO,
      image: FAL_ENDPOINTS.SEEDANCE_IMAGE_TO_VIDEO,
    },
    [VIDEO_MODELS.MINIMAX_HAILUO_02_PRO]: {
      text: FAL_ENDPOINTS.MINIMAX_TEXT_TO_VIDEO,
      image: FAL_ENDPOINTS.MINIMAX_IMAGE_TO_VIDEO,
    },
  };

  const endpoints = endpointMap[model];
  if (!endpoints) {
    throw new Error(`Unsupported model: ${model}`);
  }

  return hasImage ? endpoints.image : endpoints.text;
}

/**
 * Initiates video generation using FAL.ai models via REST API.
 *
 * @param params - Video generation parameters
 * @returns Request ID and endpoint for status polling
 * @throws Error if API request fails
 */
export async function generateFalVideo(params: FalVideoParams): Promise<{ requestId: string; endpoint: string }> {
  const apiKey = getFalApiKey();
  const endpoint = getFalEndpoint(params.model, !!params.imageUrl);

  // Build input based on model
  const input: Record<string, unknown> = {
    prompt: params.prompt,
  };

  // Add image URL if provided
  if (params.imageUrl) {
    input.image_url = params.imageUrl;
  }

  // Add model-specific parameters
  if (params.model === VIDEO_MODELS.SEEDANCE_1_0_PRO) {
    // Seedance-specific parameters
    if (params.resolution) {
      input.resolution = params.resolution;
    }
    if (params.duration) {
      input.duration = params.duration.toString(); // Seedance expects string
    }
    if (params.aspectRatio) {
      input.aspect_ratio = params.aspectRatio;
    }
  } else if (params.model === VIDEO_MODELS.MINIMAX_HAILUO_02_PRO) {
    // MiniMax Hailuo-02 Pro specific parameters
    input.prompt_optimizer = params.promptOptimizer !== undefined ? params.promptOptimizer : true;

    // Add aspect ratio and duration for MiniMax Pro
    if (params.aspectRatio) {
      input.aspect_ratio = params.aspectRatio;
    }
    if (params.duration) {
      input.duration = params.duration;
    }
  }

  try {
    // Submit the request to FAL queue API with timeout
    const controller = new AbortController();
    const timeout = setTimeout((): void => controller.abort(), TIMEOUTS.FAL_SUBMIT);

    let response;
    try {
      response = await fetch(`${API_ENDPOINTS.FAL_QUEUE}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL API error: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`FAL video generation request timeout after ${TIMEOUTS.FAL_SUBMIT}ms`);
      }
      throw err;
    }

    const result = await response.json();

    return {
      requestId: result.request_id,
      endpoint,
    };
  } catch (error) {
    // Log error for debugging (server-side only)
    if (typeof process !== 'undefined' && process.env) {
      const { serverLogger } = await import('./serverLogger');
      serverLogger.error({ error, model: params.model, endpoint }, 'FAL video generation error');
    }
    throw new Error(`FAL video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks the status of a FAL video generation operation.
 *
 * @param requestId - Request ID from generateFalVideo()
 * @param endpoint - The FAL endpoint used for generation
 * @returns Current status and result if complete
 * @throws Error if status check fails
 */
export async function checkFalVideoStatus(
  requestId: string,
  endpoint: string
): Promise<{ done: boolean; result?: FalVideoResult; error?: string }> {
  const apiKey = getFalApiKey();

  try {
    // Check status via FAL status API with timeout
    const controller = new AbortController();
    const timeout = setTimeout((): void => controller.abort(), TIMEOUTS.FAL_STATUS);

    let response;
    try {
      response = await fetch(`${API_ENDPOINTS.FAL_QUEUE}/${endpoint}/requests/${requestId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL status check error: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`FAL status check timeout after ${TIMEOUTS.FAL_STATUS}ms`);
      }
      throw err;
    }

    const statusData = await response.json();

    // Check if completed
    if (statusData.status === 'COMPLETED') {
      // Fetch the result with timeout
      const resultController = new AbortController();
      const resultTimeout = setTimeout((): void => resultController.abort(), TIMEOUTS.FAL_RESULT);

      let resultResponse;
      try {
        resultResponse = await fetch(`${API_ENDPOINTS.FAL_QUEUE}/${endpoint}/requests/${requestId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${apiKey}`,
          },
          signal: resultController.signal,
        });

        clearTimeout(resultTimeout);

        if (!resultResponse.ok) {
          throw new Error(`Failed to fetch result: ${resultResponse.status}`);
        }
      } catch (err) {
        clearTimeout(resultTimeout);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error(`FAL result fetch timeout after ${TIMEOUTS.FAL_RESULT}ms`);
        }
        throw err;
      }

      const result = await resultResponse.json();

      return {
        done: true,
        result: result as FalVideoResult,
      };
    }

    // Check if failed
    if (statusData.status === 'FAILED') {
      return {
        done: true,
        error: statusData.error || 'Video generation failed',
      };
    }

    // Still in progress
    return {
      done: false,
    };
  } catch (error) {
    // Log error for debugging (server-side only)
    if (typeof process !== 'undefined' && process.env) {
      const { serverLogger } = await import('./serverLogger');
      serverLogger.error({ error, requestId, endpoint }, 'FAL status check error');
    }
    throw new Error(`FAL status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cancels a running FAL video generation operation.
 *
 * @param requestId - Request ID to cancel
 * @param endpoint - The FAL endpoint used for generation
 * @throws Error if cancellation fails
 */
export async function cancelFalVideo(requestId: string, endpoint: string): Promise<void> {
  const apiKey = getFalApiKey();

  try {
    // Cancel request with timeout
    const controller = new AbortController();
    const timeout = setTimeout((): void => controller.abort(), TIMEOUTS.FAL_STATUS);

    try {
      const response = await fetch(`${API_ENDPOINTS.FAL_QUEUE}/${endpoint}/requests/${requestId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL cancellation error: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`FAL cancellation timeout after ${TIMEOUTS.FAL_STATUS}ms`);
      }
      throw err;
    }
  } catch (error) {
    // Log error for debugging (server-side only)
    if (typeof process !== 'undefined' && process.env) {
      const { serverLogger } = await import('./serverLogger');
      serverLogger.error({ error, requestId, endpoint }, 'FAL cancellation error');
    }
    throw new Error(`FAL cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
