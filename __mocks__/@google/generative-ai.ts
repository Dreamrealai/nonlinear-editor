/**
 * Mock for @google/generative-ai package
 * Used for testing Gemini AI integration without making actual API calls
 */

export const mockGenerateContent = jest.fn();
export const mockGenerateContentStream = jest.fn();
export const mockCountTokens = jest.fn();
export const mockEmbedContent = jest.fn();

export class GoogleGenerativeAI {
  constructor(_apiKey: string) {
    // Mock constructor
  }

  getGenerativeModel(_config: { model: string }): unknown {
    return {
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
      countTokens: mockCountTokens,
      embedContent: mockEmbedContent,
      startChat: jest.fn(() => ({
        sendMessage: mockGenerateContent,
        sendMessageStream: mockGenerateContentStream,
        getHistory: jest.fn(() => []),
      })),
    };
  }
}

export const HarmCategory = {
  HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
};

export const HarmBlockThreshold = {
  BLOCK_NONE: 'BLOCK_NONE',
  BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
  BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
};

/**
 * Helper to mock successful content generation
 */
export function mockGenerateContentSuccess(text: string): void {
  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => text,
      candidates: [
        {
          content: {
            parts: [{ text }],
            role: 'model',
          },
          finishReason: 'STOP',
          safetyRatings: [],
        },
      ],
    },
  });
}

/**
 * Helper to mock content generation error
 */
export function mockGenerateContentError(error: string): void {
  mockGenerateContent.mockRejectedValue(new Error(error));
}

/**
 * Reset all mocks
 */
export function resetGoogleAIMocks(): void {
  mockGenerateContent.mockReset();
  mockGenerateContentStream.mockReset();
  mockCountTokens.mockReset();
  mockEmbedContent.mockReset();
}
