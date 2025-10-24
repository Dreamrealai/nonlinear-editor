/**
 * Tests for Google Gemini AI Integration
 *
 * @module __tests__/lib/gemini.test
 */

import { makeAIClient, chat } from '@/lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';

// Mock the AI SDKs
jest.mock('@google/generative-ai');
jest.mock('@google-cloud/vertexai');
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const MockGoogleGenerativeAI = GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>;
const MockVertexAI = VertexAI as jest.MockedClass<typeof VertexAI>;

describe('makeAIClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear all AI-related env vars
    delete process.env.AISTUDIO_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_SERVICE_ACCOUNT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('AI Studio Authentication', () => {
    it('should create AI Studio client with AISTUDIO_API_KEY', async () => {
      process.env.AISTUDIO_API_KEY = 'test-api-key-123';

      const mockClient = {} as any;
      MockGoogleGenerativeAI.mockImplementation(() => mockClient);

      const result = await makeAIClient();

      expect(result).toEqual({ type: 'studio', client: mockClient });
      expect(MockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key-123');
    });

    it('should prioritize AISTUDIO_API_KEY over GEMINI_API_KEY', async () => {
      process.env.AISTUDIO_API_KEY = 'aistudio-key';
      process.env.GEMINI_API_KEY = 'gemini-key';

      const mockClient = {} as any;
      MockGoogleGenerativeAI.mockImplementation(() => mockClient);

      await makeAIClient();

      expect(MockGoogleGenerativeAI).toHaveBeenCalledWith('aistudio-key');
    });

    it('should fall back to GEMINI_API_KEY if AISTUDIO_API_KEY not set', async () => {
      process.env.GEMINI_API_KEY = 'gemini-key-456';

      const mockClient = {} as any;
      MockGoogleGenerativeAI.mockImplementation(() => mockClient);

      const result = await makeAIClient();

      expect(result).toEqual({ type: 'studio', client: mockClient });
      expect(MockGoogleGenerativeAI).toHaveBeenCalledWith('gemini-key-456');
    });
  });

  describe('Vertex AI Authentication', () => {
    it('should create Vertex AI client with service account', async () => {
      const serviceAccount = {
        project_id: 'test-project',
        client_email: 'test@test.iam.gserviceaccount.com',
        private_key: 'test-key',
      };
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify(serviceAccount);

      const mockClient = {} as any;
      MockVertexAI.mockImplementation(() => mockClient);

      const result = await makeAIClient();

      expect(result).toEqual({
        type: 'vertex',
        client: mockClient,
        projectId: 'test-project',
      });
      expect(MockVertexAI).toHaveBeenCalledWith({
        project: 'test-project',
        location: 'us-central1',
        googleAuthOptions: {
          credentials: serviceAccount,
        },
      });
    });

    it('should throw error for invalid JSON in service account', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT = 'invalid-json';

      await expect(makeAIClient()).rejects.toThrow(
        'GOOGLE_SERVICE_ACCOUNT environment variable contains invalid JSON'
      );
    });

    it('should throw error if service account missing project_id', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
        client_email: 'test@test.iam.gserviceaccount.com',
      });

      await expect(makeAIClient()).rejects.toThrow(
        'GOOGLE_SERVICE_ACCOUNT must contain project_id field'
      );
    });

    it('should handle Vertex AI initialization error', async () => {
      const serviceAccount = {
        project_id: 'test-project',
        client_email: 'test@test.iam.gserviceaccount.com',
      };
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify(serviceAccount);

      MockVertexAI.mockImplementation(() => {
        throw new Error('Auth failed');
      });

      await expect(makeAIClient()).rejects.toThrow('Failed to initialize Vertex AI: Auth failed');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no authentication method available', async () => {
      await expect(makeAIClient()).rejects.toThrow(
        'Either AISTUDIO_API_KEY, GEMINI_API_KEY, or GOOGLE_SERVICE_ACCOUNT environment variable is required'
      );
    });
  });
});

describe('chat', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.AISTUDIO_API_KEY = 'test-api-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('AI Studio Chat', () => {
    it('should send simple text message', async () => {
      const mockResponse = { text: () => 'AI response' };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      const response = await chat({
        model: 'gemini-2.5-flash',
        message: 'Hello',
      });

      expect(response).toBe('AI response');
      expect(mockGetModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
      expect(mockStartChat).toHaveBeenCalledWith({
        history: [],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      });
      expect(mockSendMessage).toHaveBeenCalledWith([{ text: 'Hello' }]);
    });

    it('should send message with file attachments', async () => {
      const mockResponse = { text: () => 'AI response with image analysis' };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      const response = await chat({
        model: 'gemini-2.5-flash',
        message: 'What is in this image?',
        files: [
          {
            data: 'base64-encoded-image',
            mimeType: 'image/jpeg',
          },
        ],
      });

      expect(response).toBe('AI response with image analysis');
      expect(mockSendMessage).toHaveBeenCalledWith([
        { text: 'What is in this image?' },
        {
          inlineData: {
            data: 'base64-encoded-image',
            mimeType: 'image/jpeg',
          },
        },
      ]);
    });

    it('should send message with conversation history', async () => {
      const mockResponse = { text: () => 'Continue story response' };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      const history = [
        { role: 'user' as const, parts: [{ text: 'Tell me a story' }] },
        { role: 'model' as const, parts: [{ text: 'Once upon a time...' }] },
      ];

      await chat({
        model: 'gemini-2.5-flash',
        message: 'Continue the story',
        history,
      });

      expect(mockStartChat).toHaveBeenCalledWith({
        history,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      });
    });

    it('should send message with multiple file attachments', async () => {
      const mockResponse = { text: () => 'Multiple images analyzed' };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      await chat({
        model: 'gemini-2.5-flash',
        message: 'Compare these images',
        files: [
          { data: 'image1-data', mimeType: 'image/jpeg' },
          { data: 'image2-data', mimeType: 'image/png' },
        ],
      });

      expect(mockSendMessage).toHaveBeenCalledWith([
        { text: 'Compare these images' },
        { inlineData: { data: 'image1-data', mimeType: 'image/jpeg' } },
        { inlineData: { data: 'image2-data', mimeType: 'image/png' } },
      ]);
    });
  });

  describe('Vertex AI Chat', () => {
    beforeEach(() => {
      delete process.env.AISTUDIO_API_KEY;
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({
        project_id: 'test-project',
        client_email: 'test@test.iam.gserviceaccount.com',
        private_key: 'test-key',
      });
    });

    it('should send message via Vertex AI', async () => {
      const mockResponse = {
        candidates: [{ content: { parts: [{ text: 'Vertex AI response' }] } }],
      };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockVertexAI.mockImplementation(() => mockClient as any);

      const response = await chat({
        model: 'gemini-2.5-flash',
        message: 'Hello Vertex',
      });

      expect(response).toBe('Vertex AI response');
      expect(mockGetModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
    });

    it('should normalize model names for Vertex AI', async () => {
      const mockResponse = {
        candidates: [{ content: { parts: [{ text: 'Response' }] } }],
      };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockVertexAI.mockImplementation(() => mockClient as any);

      await chat({
        model: 'gemini-flash-latest',
        message: 'Test',
      });

      // Should normalize to gemini-2.5-flash
      expect(mockGetModel).toHaveBeenCalledWith({ model: 'gemini-2.5-flash' });
    });

    it('should handle Vertex AI with file attachments', async () => {
      const mockResponse = {
        candidates: [{ content: { parts: [{ text: 'Image analyzed' }] } }],
      };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockVertexAI.mockImplementation(() => mockClient as any);

      await chat({
        model: 'gemini-2.5-flash',
        message: 'Analyze this',
        files: [{ data: 'image-data', mimeType: 'image/jpeg' }],
      });

      expect(mockSendMessage).toHaveBeenCalledWith([
        { text: 'Analyze this' },
        { inlineData: { mimeType: 'image/jpeg', data: 'image-data' } },
      ]);
    });

    it('should return default message when no response generated', async () => {
      const mockResponse = { candidates: [] };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest.fn().mockResolvedValue(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockVertexAI.mockImplementation(() => mockClient as any);

      const response = await chat({
        model: 'gemini-2.5-flash',
        message: 'Test',
      });

      expect(response).toBe('No response generated');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on timeout error', async () => {
      const mockResponse = { text: () => 'Success after retry' };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      const response = await chat({
        model: 'gemini-2.5-flash',
        message: 'Test',
      });

      expect(response).toBe('Success after retry');
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
    });

    it('should retry on ETIMEDOUT error', async () => {
      const mockResponse = { text: () => 'Success' };
      const mockResult = { response: mockResponse };
      const mockSendMessage = jest
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(mockResult);
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      await chat({
        model: 'gemini-2.5-flash',
        message: 'Test',
      });

      expect(mockSendMessage).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on timeout', async () => {
      const mockSendMessage = jest.fn().mockRejectedValue(new Error('timeout'));
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      await expect(
        chat({
          model: 'gemini-2.5-flash',
          message: 'Test',
        })
      ).rejects.toThrow('Gemini API timeout after 3 attempts');

      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-timeout errors', async () => {
      const mockSendMessage = jest.fn().mockRejectedValue(new Error('API key invalid'));
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      await expect(
        chat({
          model: 'gemini-2.5-flash',
          message: 'Test',
        })
      ).rejects.toThrow('Gemini API error: API key invalid');

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown error type', async () => {
      const mockSendMessage = jest.fn().mockRejectedValue('string error');
      const mockStartChat = jest.fn().mockReturnValue({ sendMessage: mockSendMessage });
      const mockModel = { startChat: mockStartChat };
      const mockGetModel = jest.fn().mockReturnValue(mockModel);
      const mockClient = { getGenerativeModel: mockGetModel };

      MockGoogleGenerativeAI.mockImplementation(() => mockClient as any);

      await expect(
        chat({
          model: 'gemini-2.5-flash',
          message: 'Test',
        })
      ).rejects.toThrow('Gemini API error: Unknown error');
    });
  });
});
