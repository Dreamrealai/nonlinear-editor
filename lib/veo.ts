/**
 * Google Veo 3.1 Video Generation API Integration
 *
 * This module provides functions to generate videos using Google's Veo 3.1 model.
 * Veo is Google's state-of-the-art text-to-video generation model.
 *
 * Architecture:
 * - Uses Google Cloud Service Account for authentication
 * - Long-running operations (LRO) pattern for async video generation
 * - Polling-based status checking via fetchPredictOperation endpoint
 *
 * Required Environment Variables:
 * - GOOGLE_SERVICE_ACCOUNT: JSON string containing service account credentials
 *
 * API Documentation:
 * - Endpoint: us-central1-aiplatform.googleapis.com/v1/publishers/google/models/veo-3.1-generate-preview
 * - Supports aspect ratios: 9:16 (vertical), 16:9 (landscape), 1:1 (square)
 * - Durations: Typically 5 or 8 seconds
 * - Audio generation: Enabled by default in Veo 3.1
 */

import { GoogleAuth } from 'google-auth-library';

/**
 * Parameters for Veo video generation request.
 */
interface VeoGenerateParams {
  /** Text prompt describing the video to generate */
  prompt: string;
  /** Veo model to use for generation */
  model?: string;
  /** Aspect ratio for the generated video */
  aspectRatio?: '9:16' | '16:9' | '1:1';
  /** Duration in seconds (4, 5, 6, or 8) */
  duration?: number;
  /** Resolution for Veo 3 models (720p or 1080p) */
  resolution?: '720p' | '1080p';
  /** Negative prompt - elements to avoid in the video */
  negativePrompt?: string;
  /** Person generation safety setting */
  personGeneration?: 'allow_adult' | 'dont_allow';
  /** Use Gemini to enhance the prompt */
  enhancePrompt?: boolean;
  /** Generate audio for the video (Veo 3 only) */
  generateAudio?: boolean;
  /** Random seed for reproducible generation (0-4294967295) */
  seed?: number;
  /** Number of videos to generate (1-4) */
  sampleCount?: number;
  /** Compression quality (optimized or lossless) */
  compressionQuality?: 'optimized' | 'lossless';
  /** URL of reference image for image-to-video generation */
  imageUrl?: string;
}

/**
 * Response from initiating a Veo video generation.
 * Contains the operation name for status polling.
 */
interface VeoGenerateResponse {
  /** Operation name (format: projects/{project}/locations/{location}/operations/{id}) */
  name: string;
  /** Optional metadata about operation progress */
  metadata?: {
    /** Progress percentage (0-100) */
    progressPercentage?: number;
    /** Current operation status */
    status?: string;
  };
}

/**
 * Result from checking operation status.
 * Represents the state of a long-running video generation task.
 */
interface VeoOperationResult {
  /** True if operation has completed (successfully or with error) */
  done: boolean;
  /** Response data (only present when done=true and successful) */
  response?: {
    /** Response type identifier */
    '@type'?: string;
    /** Number of videos filtered by content safety */
    raiMediaFilteredCount?: number;
    /** Reasons why content was filtered */
    raiMediaFilteredReasons?: string[];
    /** Generated video data */
    videos?: Array<{
      /** Google Cloud Storage URI for the video */
      gcsUri?: string;
      /** Base64-encoded video data (alternative to gcsUri) */
      bytesBase64Encoded?: string;
      /** MIME type (e.g., video/mp4) */
      mimeType: string;
    }>;
  };
  /** Error information (only present when operation failed) */
  error?: {
    /** Error code */
    code: number;
    /** Error message */
    message: string;
  };
  /** Progress metadata (present while operation is running) */
  metadata?: {
    /** Progress percentage (0-100) */
    progressPercentage?: number;
  };
}

/**
 * Creates an authenticated Google Cloud client using service account credentials.
 *
 * Authentication flow:
 * 1. Parse service account JSON from environment variable
 * 2. Create GoogleAuth instance with cloud-platform scope
 * 3. Return auth client for making API requests
 *
 * @returns GoogleAuth client instance
 * @throws Error if GOOGLE_SERVICE_ACCOUNT env var is missing
 */
function getAuthClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is required');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  return new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
}

/**
 * Initiates video generation using Google Veo 3.1 model.
 *
 * This function starts a long-running operation (LRO) for video generation.
 * The operation name returned must be used with checkOperationStatus() to poll
 * for completion.
 *
 * Process:
 * 1. Authenticate with Google Cloud using service account
 * 2. Send POST request to Veo predictLongRunning endpoint
 * 3. Return operation name for status tracking
 *
 * Typical generation time: 30 seconds to several minutes depending on duration
 *
 * @param params - Video generation parameters
 * @returns Operation metadata including operation name for polling
 * @throws Error if authentication fails or API request is rejected
 *
 * @example
 * const operation = await generateVideo({
 *   prompt: "A serene sunset over the ocean",
 *   aspectRatio: "16:9",
 *   duration: 8
 * });
 * // Poll with: checkOperationStatus(operation.name)
 */
export async function generateVideo(params: VeoGenerateParams): Promise<VeoGenerateResponse> {
  const auth = getAuthClient();
  const client = await auth.getClient();
  const projectId = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}').project_id;

  if (!projectId) {
    throw new Error('Could not extract project_id from GOOGLE_SERVICE_ACCOUNT');
  }

  // Use specified model or default to veo-3.1-generate-preview
  const model = params.model || 'veo-3.1-generate-preview';
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:predictLongRunning`;

  // Build parameters according to Veo API specification
  const parameters: Record<string, unknown> = {
    aspectRatio: params.aspectRatio || '16:9',
    durationSeconds: params.duration || 8,
    enhancePrompt: params.enhancePrompt !== undefined ? params.enhancePrompt : true,
  };

  // Add optional parameters
  if (params.resolution !== undefined) {
    parameters.resolution = params.resolution;
  }

  if (params.negativePrompt !== undefined && params.negativePrompt.trim()) {
    parameters.negativePrompt = params.negativePrompt.trim();
  }

  if (params.personGeneration !== undefined) {
    parameters.personGeneration = params.personGeneration;
  }

  if (params.generateAudio !== undefined) {
    parameters.generateAudio = params.generateAudio;
  }

  if (params.seed !== undefined) {
    parameters.seed = params.seed;
  }

  if (params.sampleCount !== undefined) {
    parameters.sampleCount = params.sampleCount;
  }

  if (params.compressionQuality !== undefined) {
    parameters.compressionQuality = params.compressionQuality;
  }

  // Build instances with optional image reference
  const instance: Record<string, unknown> = {
    prompt: params.prompt,
  };

  // Add reference image if provided (for image-to-video generation)
  if (params.imageUrl !== undefined) {
    instance.image = {
      gcsUri: params.imageUrl,
    };
  }

  // Build request body
  const requestBody = {
    instances: [instance],
    parameters,
  };

  // Add timeout handling for long-running video generation
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await client.getAccessToken().then(token => token.token)}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Veo API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Video generation request timeout after 60 seconds');
    }
    throw error;
  }
}

/**
 * Checks the status of a video generation operation.
 *
 * This function polls the Veo API to get the current status of a long-running
 * video generation operation. Should be called periodically until done=true.
 *
 * Operation states:
 * - In progress: done=false, metadata.progressPercentage shows progress
 * - Completed: done=true, response.videos contains generated video(s)
 * - Failed: done=true, error contains error details
 * - Filtered: done=true, response.raiMediaFilteredReasons explains why content was blocked
 *
 * Recommended polling interval: 5-10 seconds
 *
 * @param operationName - Operation name from generateVideo() response
 * @returns Current operation status
 * @throws Error if status check request fails
 *
 * @example
 * const status = await checkOperationStatus(operationName);
 * if (status.done && status.response?.videos) {
 *   const videoUri = status.response.videos[0].gcsUri;
 *   // Download video from GCS
 * }
 */
export async function checkOperationStatus(operationName: string, model?: string): Promise<VeoOperationResult> {
  const auth = getAuthClient();
  const client = await auth.getClient();
  const projectId = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}').project_id;

  if (!projectId) {
    throw new Error('Could not extract project_id from GOOGLE_SERVICE_ACCOUNT');
  }

  // Extract model from operation name if not provided
  // Operation name format: projects/{project}/locations/{location}/publishers/google/models/{model}/operations/{id}
  const modelName = model || operationName.split('/models/')[1]?.split('/operations/')[0] || 'veo-3.1-generate-preview';

  // Use Veo-specific status check endpoint (fetchPredictOperation)
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelName}:fetchPredictOperation`;

  // Add timeout handling
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await client.getAccessToken().then(token => token.token)}`,
      },
      body: JSON.stringify({
        operationName: operationName,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Operation status check failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Veo status check timeout after 60s');
    }
    throw error;
  }
}

/**
 * Cancels a running video generation operation.
 *
 * Attempts to stop an in-progress video generation. Note that cancellation
 * is not guaranteed if the operation is in a non-cancellable state.
 *
 * Use cases:
 * - User-initiated cancellation
 * - Timeout handling
 * - Resource cleanup
 *
 * @param operationName - Full operation name to cancel
 * @throws Error if cancellation request fails
 */
export async function cancelOperation(operationName: string): Promise<void> {
  const auth = getAuthClient();
  const client = await auth.getClient();

  // Standard Google Cloud Operations API cancellation endpoint
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}:cancel`;

  // Add timeout handling
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await client.getAccessToken().then(token => token.token)}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Operation cancellation failed: ${response.status} - ${error}`);
    }
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Operation cancellation timeout after 60s');
    }
    throw error;
  }
}
