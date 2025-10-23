import { GoogleAuth } from 'google-auth-library';

interface VeoGenerateParams {
  prompt: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  duration?: number; // seconds, typically 5 or 8
  seed?: number;
}

interface VeoGenerateResponse {
  name: string;
  metadata?: {
    progressPercentage?: number;
    status?: string;
  };
}

interface VeoOperationResult {
  done: boolean;
  response?: {
    '@type'?: string;
    raiMediaFilteredCount?: number;
    raiMediaFilteredReasons?: string[];
    videos?: Array<{
      gcsUri?: string;
      bytesBase64Encoded?: string;
      mimeType: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
  metadata?: {
    progressPercentage?: number;
  };
}

/**
 * Get authenticated Google Cloud client using service account
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
 * Generate video using Google Veo 3.1
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

  const requestBody = {
    instances: [
      {
        prompt: params.prompt,
      },
    ],
    parameters: {
      aspectRatio: params.aspectRatio || '16:9',
      durationSeconds: params.duration || 8,
      generateAudio: true, // Veo 3+ supports audio generation
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
