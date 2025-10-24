/**
 * Mock for @google-cloud/vertexai package
 * Used for testing Vertex AI video generation without making actual API calls
 */

export const mockGenerateVideo = jest.fn();
export const mockGetOperation = jest.fn();
export const mockListOperations = jest.fn();

export class VertexAI {
  constructor(config: { project: string; location: string }) {
    // Mock constructor
  }

  preview = {
    getGenerativeModel: (config: { model: string }) => ({
      generateContent: mockGenerateVideo,
    }),
  };
}

/**
 * Helper to mock successful video generation (initiated)
 */
export function mockVideoGenerationInitiated(operationName: string) {
  mockGenerateVideo.mockResolvedValue({
    response: {
      operationName,
    },
  });
}

/**
 * Helper to mock operation in progress
 */
export function mockOperationInProgress(progressPercentage = 50) {
  mockGetOperation.mockResolvedValue({
    done: false,
    metadata: {
      progressPercentage,
    },
  });
}

/**
 * Helper to mock completed operation with video data
 */
export function mockOperationComplete(videoBase64: string) {
  mockGetOperation.mockResolvedValue({
    done: true,
    response: {
      videos: [
        {
          bytesBase64Encoded: videoBase64,
          mimeType: 'video/mp4',
        },
      ],
    },
  });
}

/**
 * Helper to mock operation error
 */
export function mockOperationError(error: string) {
  mockGetOperation.mockResolvedValue({
    done: true,
    error: {
      message: error,
      code: 500,
    },
  });
}

/**
 * Reset all mocks
 */
export function resetVertexAIMocks() {
  mockGenerateVideo.mockReset();
  mockGetOperation.mockReset();
  mockListOperations.mockReset();
}
