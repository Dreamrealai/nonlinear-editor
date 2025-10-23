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
  /** Aspect ratio for the generated video */
  aspectRatio?: '9:16' | '16:9' | '1:1';
  /** Duration in seconds (typically 5 or 8) */
  duration?: number;
  /** Random seed for reproducible generation (optional) */
  seed?: number;
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

  // Veo 3.1 API endpoint (uses predictLongRunning for async video generation)
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:predictLongRunning`;

  // Build request body according to Veo API specification
  const requestBody = {
    instances: [
      {
        prompt: params.prompt,
      },
    ],
    parameters: {
      aspectRatio: params.aspectRatio || '16:9',
      durationSeconds: params.duration || 8,
      generateAudio: true, // Veo 3.1+ supports synchronized audio generation
      ...(params.seed !== undefined && { seed: params.seed }),
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await client.getAccessToken().then(token => token.token)}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Veo API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Check the status of a video generation operation using Veo's fetchPredictOperation
 */
export async function checkOperationStatus(operationName: string): Promise<VeoOperationResult> {
  const auth = getAuthClient();
  const client = await auth.getClient();
  const projectId = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || '{}').project_id;

  if (!projectId) {
    throw new Error('Could not extract project_id from GOOGLE_SERVICE_ACCOUNT');
  }

  // Use Veo-specific status check endpoint
  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.1-generate-preview:fetchPredictOperation`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await client.getAccessToken().then(token => token.token)}`,
    },
    body: JSON.stringify({
      operationName: operationName,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Operation status check failed: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Cancel a running video generation operation
 */
export async function cancelOperation(operationName: string): Promise<void> {
  const auth = getAuthClient();
  const client = await auth.getClient();

  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}:cancel`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await client.getAccessToken().then(token => token.token)}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Operation cancellation failed: ${response.status} - ${error}`);
  }
}
