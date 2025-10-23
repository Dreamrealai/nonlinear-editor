/**
 * Google Imagen 3/4 Image Generation API Integration
 *
 * This module provides functions to generate images using Google's Imagen 3 and Imagen 4 models.
 * Imagen is Google's state-of-the-art text-to-image generation model.
 *
 * Architecture:
 * - Uses Google Cloud Service Account for authentication
 * - Synchronous generation returns images immediately
 *
 * Required Environment Variables:
 * - GOOGLE_SERVICE_ACCOUNT: JSON string containing service account credentials
 *
 * API Documentation:
 * - Endpoint: us-central1-aiplatform.googleapis.com/v1/projects/{project}/locations/us-central1/publishers/google/models/{model}:predict
 * - Supports aspect ratios: 1:1, 9:16, 16:9, 3:4, 4:3
 * - Number of images: 1-8
 */

import { GoogleAuth } from 'google-auth-library';

/**
 * Parameters for Imagen image generation request.
 */
export interface ImagenGenerateParams {
  /** Text prompt describing the image to generate */
  prompt: string;
  /** Imagen model to use for generation */
  model?: string;
  /** Aspect ratio for the generated image */
  aspectRatio?: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
  /** Negative prompt - elements to avoid in the image */
  negativePrompt?: string;
  /** Number of images to generate (1-8) */
  sampleCount?: number;
  /** Random seed for reproducible generation */
  seed?: number;
  /** Safety filter level */
  safetyFilterLevel?: 'block_most' | 'block_some' | 'block_few' | 'block_fewest';
  /** Person generation setting */
  personGeneration?: 'allow_adult' | 'dont_allow';
  /** Add watermark to image */
  addWatermark?: boolean;
  /** Language of the prompt */
  language?: string;
  /** Output MIME type */
  outputMimeType?: 'image/png' | 'image/jpeg';
}

/**
 * Response from Imagen image generation.
 */
export interface ImagenGenerateResponse {
  /** Array of generated image predictions */
  predictions: Array<{
    /** Base64-encoded image data */
    bytesBase64Encoded: string;
    /** MIME type */
    mimeType: string;
  }>;
  /** Metadata about the generation */
  metadata?: {
    /** Number of images filtered by content safety */
    raiMediaFilteredCount?: number;
    /** Reasons why content was filtered */
    raiMediaFilteredReasons?: string[];
  };
}

/**
 * Generates images using Google Vertex AI Imagen models.
 *
 * @param params - Image generation parameters
 * @returns Promise resolving to the generation response
 * @throws Error if authentication fails or generation fails
 */
export async function generateImage(params: ImagenGenerateParams): Promise<ImagenGenerateResponse> {
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is not set');
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccount);
  } catch {
    throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT JSON');
  }

  // Create auth client
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new Error('Failed to get access token');
  }

  // Extract project ID from service account
  const projectId = credentials.project_id;
  if (!projectId) {
    throw new Error('Project ID not found in service account credentials');
  }

  // Default to Imagen 3 if no model specified
  const model = params.model || 'imagen-3.0-generate-001';
  const location = 'us-central1';

  // Build the request body
  const instances = [
    {
      prompt: params.prompt,
    },
  ];

  const parameters: Record<string, unknown> = {
    sampleCount: params.sampleCount || 1,
  };

  if (params.aspectRatio) {
    parameters.aspectRatio = params.aspectRatio;
  }

  if (params.negativePrompt) {
    parameters.negativePrompt = params.negativePrompt;
  }

  if (params.seed !== undefined) {
    parameters.seed = params.seed;
  }

  if (params.safetyFilterLevel) {
    parameters.safetyFilterLevel = params.safetyFilterLevel;
  }

  if (params.personGeneration) {
    parameters.personGeneration = params.personGeneration;
  }

  if (params.addWatermark !== undefined) {
    parameters.addWatermark = params.addWatermark;
  }

  if (params.language) {
    parameters.language = params.language;
  }

  if (params.outputMimeType) {
    parameters.outputMimeType = params.outputMimeType;
  }

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

  // Add timeout handling
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances,
        parameters,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Imagen API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result as ImagenGenerateResponse;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Imagen API request timeout after 60s');
    }
    throw error;
  }
}
