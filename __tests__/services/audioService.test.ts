/**
 * Tests for AudioService
 */

import { AudioService } from '@/lib/services/audioService';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock external modules
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    EXTERNAL_SERVICE: 'external_service',
    DATABASE: 'database',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AudioService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let audioService: AudioService;
  const originalEnv = process.env;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    audioService = new AudioService(mockSupabase);

    // Set up environment
    process.env = { ...originalEnv, ELEVENLABS_API_KEY: 'test-api-key' };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('generateTTS', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = 'user123';

    it('should generate TTS successfully with default options', async () => {
      const options = {
        text: 'Hello, world!',
      };

      // Mock fetch for ElevenLabs API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      // Mock storage upload
      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'audio/file.mp3' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      // Mock asset creation
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-123',
          type: 'audio',
          storage_url: 'supabase://assets/path',
          metadata: {
            provider: 'elevenlabs',
          },
        },
        error: null,
      });

      const result = await audioService.generateTTS(userId, validProjectId, options);

      expect(result.success).toBe(true);
      expect(result.asset).toBeDefined();
      expect(result.message).toBe('Audio generated successfully');

      // Verify ElevenLabs API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: options.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        })
      );
    });

    it('should use custom voice and model options', async () => {
      const options = {
        text: 'Custom voice test',
        voiceId: 'custom-voice-id',
        modelId: 'eleven_turbo_v2',
        stability: 0.8,
        similarity: 0.9,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'audio/file.mp3' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-123',
          type: 'audio',
          storage_url: 'supabase://assets/path',
        },
        error: null,
      });

      await audioService.generateTTS(userId, validProjectId, options);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/custom-voice-id',
        expect.objectContaining({
          body: JSON.stringify({
            text: options.text,
            model_id: options.modelId,
            voice_settings: {
              stability: options.stability,
              similarity_boost: options.similarity,
            },
          }),
        })
      );
    });

    it('should throw error if API key is not configured', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const options = {
        text: 'Test',
      };

      await expect(audioService.generateTTS(userId, validProjectId, options)).rejects.toThrow(
        'ElevenLabs API key not configured'
      );
    });

    it('should throw error for invalid project ID', async () => {
      const options = {
        text: 'Test',
      };

      await expect(audioService.generateTTS(userId, 'invalid-uuid', options)).rejects.toThrow();
    });

    it('should handle ElevenLabs API errors', async () => {
      const options = {
        text: 'Test',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(audioService.generateTTS(userId, validProjectId, options)).rejects.toThrow(
        'ElevenLabs API error'
      );
    });

    it('should handle timeout', async () => {
      const options = {
        text: 'Test',
      };

      // Mock a timeout error
      global.fetch = jest.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(audioService.generateTTS(userId, validProjectId, options)).rejects.toThrow(
        'TTS generation timeout after 60s'
      );
    });

    it('should handle storage upload failure', async () => {
      const options = {
        text: 'Test',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      await expect(audioService.generateTTS(userId, validProjectId, options)).rejects.toThrow(
        'Failed to upload audio to storage'
      );
    });

    it('should handle asset creation failure and cleanup storage', async () => {
      const options = {
        text: 'Test',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'audio/file.mp3' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabase.storage.remove.mockResolvedValue({
        data: [],
        error: null,
      });

      await expect(audioService.generateTTS(userId, validProjectId, options)).rejects.toThrow(
        'Failed to save asset to database'
      );

      // Verify cleanup was called
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should truncate long text in metadata', async () => {
      const longText = 'a'.repeat(300);
      const options = {
        text: longText,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'audio/file.mp3' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/audio.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-123',
          type: 'audio',
          storage_url: 'supabase://assets/path',
        },
        error: null,
      });

      await audioService.generateTTS(userId, validProjectId, options);

      // Verify metadata has truncated text (first 200 chars)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            text: longText.substring(0, 200),
          }),
        })
      );
    });
  });

  describe('generateSFX', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = 'user123';

    it('should generate sound effects successfully', async () => {
      const options = {
        text: 'Door creaking open',
        duration: 3,
        promptInfluence: 0.7,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'audio/sfx.mp3' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/sfx.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-sfx-123',
          type: 'audio',
          storage_url: 'supabase://assets/path',
          metadata: {
            provider: 'elevenlabs-sfx',
          },
        },
        error: null,
      });

      const result = await audioService.generateSFX(userId, validProjectId, options);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Sound effect generated successfully');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/sound-generation',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            text: options.text,
            duration_seconds: options.duration,
            prompt_influence: options.promptInfluence,
          }),
        })
      );
    });

    it('should use default duration and prompt influence', async () => {
      const options = {
        text: 'Thunder',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: 'audio/sfx.mp3' },
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/sfx.mp3' },
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-sfx-123',
          type: 'audio',
        },
        error: null,
      });

      await audioService.generateSFX(userId, validProjectId, options);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/sound-generation',
        expect.objectContaining({
          body: JSON.stringify({
            text: options.text,
            duration_seconds: 5, // default
            prompt_influence: 0.5, // default
          }),
        })
      );
    });

    it('should throw error if API key is not configured', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const options = {
        text: 'Test',
      };

      await expect(audioService.generateSFX(userId, validProjectId, options)).rejects.toThrow(
        'ElevenLabs API key not configured'
      );
    });

    it('should handle timeout (90 seconds)', async () => {
      const options = {
        text: 'Test',
      };

      global.fetch = jest.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(audioService.generateSFX(userId, validProjectId, options)).rejects.toThrow(
        'SFX generation timeout after 90s'
      );
    });

    it('should handle ElevenLabs SFX API errors', async () => {
      const options = {
        text: 'Test',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      });

      await expect(audioService.generateSFX(userId, validProjectId, options)).rejects.toThrow(
        'ElevenLabs SFX API error'
      );
    });
  });

  describe('generateMusic', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = 'user123';

    it('should throw not implemented error', async () => {
      const options = {
        prompt: 'Upbeat electronic music',
        duration: 30,
      };

      await expect(audioService.generateMusic(userId, validProjectId, options)).rejects.toThrow(
        'Music generation not yet implemented'
      );
    });

    it('should throw error for invalid project ID', async () => {
      const options = {
        prompt: 'Test',
      };

      await expect(audioService.generateMusic(userId, 'invalid-uuid', options)).rejects.toThrow();
    });
  });

  describe('deleteAudio', () => {
    const userId = 'user123';
    const assetId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete audio asset successfully', async () => {
      // Mock asset fetch
      mockSupabase.single.mockResolvedValue({
        data: {
          storage_url: 'supabase://assets/user123/project123/audio/file.mp3',
          type: 'audio',
        },
        error: null,
      });

      // Mock storage deletion
      mockSupabase.storage.remove.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock database deletion
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'assets') {
          // First call is for select, second is for delete
          if (mockSupabase.from.mock.calls.length === 1) {
            return mockSupabase as any;
          }
          return mockDeleteChain as any;
        }
        return mockSupabase as any;
      });

      await audioService.deleteAudio(assetId, userId);

      expect(mockSupabase.storage.remove).toHaveBeenCalledWith([
        'user123/project123/audio/file.mp3',
      ]);
    });

    it('should throw error for invalid asset ID', async () => {
      await expect(audioService.deleteAudio('invalid-uuid', userId)).rejects.toThrow();
    });

    it('should throw error if asset not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(audioService.deleteAudio(assetId, userId)).rejects.toThrow(
        'Audio asset not found or access denied'
      );
    });

    it('should continue deleting from database even if storage deletion fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          storage_url: 'supabase://assets/user123/project123/audio/file.mp3',
          type: 'audio',
        },
        error: null,
      });

      // Storage deletion fails
      mockSupabase.storage.remove.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      // Database deletion succeeds
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'assets') {
          if (mockSupabase.from.mock.calls.length === 1) {
            return mockSupabase as any;
          }
          return mockDeleteChain as any;
        }
        return mockSupabase as any;
      });

      // Should not throw
      await expect(audioService.deleteAudio(assetId, userId)).resolves.not.toThrow();
    });

    it('should throw error on database deletion failure', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          storage_url: 'supabase://assets/user123/project123/audio/file.mp3',
          type: 'audio',
        },
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValue({
        data: [],
        error: null,
      });

      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'assets') {
          if (mockSupabase.from.mock.calls.length === 1) {
            return mockSupabase as any;
          }
          return mockDeleteChain as any;
        }
        return mockSupabase as any;
      });

      await expect(audioService.deleteAudio(assetId, userId)).rejects.toThrow(
        'Failed to delete audio asset'
      );
    });

    it('should filter by audio type in the query', async () => {
      const assetId = '550e8400-e29b-41d4-a716-446655440000';

      mockSupabase.single.mockResolvedValue({
        data: {
          storage_url: 'supabase://assets/user123/project123/audio/file.mp3',
          type: 'audio',
        },
        error: null,
      });

      // Mock storage deletion
      mockSupabase.storage.remove.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock database deletion
      const mockEqChain = {
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(mockEqChain),
        }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'assets') {
          if (mockSupabase.from.mock.calls.length === 1) {
            return mockSupabase as any;
          }
          return mockDeleteChain as any;
        }
        return mockSupabase as any;
      });

      await audioService.deleteAudio(assetId, userId);

      // Verify the select query includes type filter
      expect(mockSupabase.select).toHaveBeenCalledWith('storage_url, type');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', assetId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'audio');
    });
  });
});
