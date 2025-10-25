/**
 * Tests for lib/services/audioService.ts - Audio Service Layer
 *
 * Tests cover:
 * - TTS generation with ElevenLabs
 * - SFX generation
 * - Audio asset upload and management
 * - Error handling (API errors, storage errors, timeouts)
 * - Audio deletion with cleanup
 */

import { AudioService } from '@/lib/services/audioService';
import { createMockSupabaseClient } from '@/test-utils';
import { trackError } from '@/lib/errorTracking';
import { serverLogger } from '@/lib/serverLogger';

// Mock dependencies
jest.mock('@/lib/errorTracking');
jest.mock('@/lib/serverLogger');
jest.mock('@/lib/validation', () => ({
  validateUUID: jest.fn((id: string) => {
    if (!id || id === 'invalid') {
      throw new Error('Invalid UUID');
    }
  }),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('lib/services/audioService: Audio Service Layer', () => {
  let audioService: AudioService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockUserId: string;
  let mockProjectId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSupabase = createMockSupabaseClient();
    audioService = new AudioService(mockSupabase as any);

    mockUserId = 'user-123';
    mockProjectId = 'project-456';

    // Setup storage mocks
    mockSupabase.storage = {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/audio.mp3' },
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
      }),
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.ELEVENLABS_API_KEY;
  });

  describe('generateTTS: Success Cases', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    it('should generate TTS audio with default parameters', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-123',
          user_id: mockUserId,
          project_id: mockProjectId,
          type: 'audio',
          source: 'genai',
          storage_url: `supabase://assets/${mockUserId}/${mockProjectId}/audio/elevenlabs_123.mp3`,
          metadata: {
            filename: 'elevenlabs_123.mp3',
            mimeType: 'audio/mpeg',
            provider: 'elevenlabs',
          },
        },
        error: null,
      });

      const result = await audioService.generateTTS(mockUserId, mockProjectId, {
        text: 'Hello, world!',
      });

      expect(result.success).toBe(true);
      expect(result.asset).toBeDefined();
      expect(result.message).toBe('Audio generated successfully');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should generate TTS audio with custom parameters', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-123',
          metadata: { provider: 'elevenlabs' },
        },
        error: null,
      });

      await audioService.generateTTS(mockUserId, mockProjectId, {
        text: 'Custom voice test',
        voiceId: 'custom-voice-id',
        modelId: 'eleven_turbo_v2',
        stability: 0.7,
        similarity: 0.8,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(fetchCall[0]).toContain('custom-voice-id');
      expect(requestBody).toMatchObject({
        text: 'Custom voice test',
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.8,
        },
      });
    });

    it('should upload audio to storage and create asset record', async () => {
      const mockAudioBuffer = Buffer.from('mock-audio-data');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });

      const mockStorageFrom = {
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/audio.mp3' },
        }),
      };

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue(mockStorageFrom),
      } as any;

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123' },
        error: null,
      });

      await audioService.generateTTS(mockUserId, mockProjectId, {
        text: 'Test',
      });

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
      expect(mockStorageFrom.upload).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should truncate long text in metadata', async () => {
      const longText = 'a'.repeat(300);
      const mockAudioBuffer = Buffer.from('mock-audio-data');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-123', metadata: {} },
        error: null,
      });

      await audioService.generateTTS(mockUserId, mockProjectId, {
        text: longText,
      });

      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.metadata.text.length).toBe(200);
    });
  });

  describe('generateTTS: Error Cases', () => {
    it('should throw error when API key is not set', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      await expect(
        audioService.generateTTS(mockUserId, mockProjectId, {
          text: 'Test',
        })
      ).rejects.toThrow('ElevenLabs API key not configured');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error on invalid project ID', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      await expect(
        audioService.generateTTS(mockUserId, 'invalid', {
          text: 'Test',
        })
      ).rejects.toThrow('Invalid UUID');
    });

    it('should handle ElevenLabs API error', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Insufficient credits'),
      });

      await expect(
        audioService.generateTTS(mockUserId, mockProjectId, {
          text: 'Test',
        })
      ).rejects.toThrow('ElevenLabs API error: Insufficient credits');

      expect(trackError).toHaveBeenCalled();
    });

    it('should handle timeout after 60 seconds', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('data').buffer),
            });
          }, 70000);
        });
      });

      const promise = audioService.generateTTS(mockUserId, mockProjectId, {
        text: 'Test',
      });

      jest.advanceTimersByTime(60000);

      await expect(promise).rejects.toThrow('TTS generation timeout after 60s');
    });

    it('should handle storage upload error', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('data').buffer),
      });

      const mockStorageFrom = {
        upload: jest.fn().mockResolvedValue({
          error: { message: 'Storage quota exceeded' },
        }),
      };

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue(mockStorageFrom),
      } as any;

      await expect(
        audioService.generateTTS(mockUserId, mockProjectId, {
          text: 'Test',
        })
      ).rejects.toThrow('Failed to upload audio to storage: Storage quota exceeded');
    });

    it('should handle database insert error and cleanup storage', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('data').buffer),
      });

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      const mockStorageFrom = {
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/audio.mp3' },
        }),
        remove: mockRemove,
      };

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue(mockStorageFrom),
      } as any;

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        audioService.generateTTS(mockUserId, mockProjectId, {
          text: 'Test',
        })
      ).rejects.toThrow('Failed to save asset to database: Database error');

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('generateSFX: Success Cases', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    it('should generate sound effect with default parameters', async () => {
      const mockAudioBuffer = Buffer.from('mock-sfx-data');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'asset-sfx',
          metadata: { provider: 'elevenlabs-sfx' },
        },
        error: null,
      });

      const result = await audioService.generateSFX(mockUserId, mockProjectId, {
        text: 'Door creaking open',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Sound effect generated successfully');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/sound-generation',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should generate sound effect with custom parameters', async () => {
      const mockAudioBuffer = Buffer.from('mock-sfx-data');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
      });

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset-sfx' },
        error: null,
      });

      await audioService.generateSFX(mockUserId, mockProjectId, {
        text: 'Thunder and rain',
        duration: 10,
        promptInfluence: 0.8,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        text: 'Thunder and rain',
        duration_seconds: 10,
        prompt_influence: 0.8,
      });
    });

    it('should use 90 second timeout for SFX', async () => {
      const mockAudioBuffer = Buffer.from('mock-sfx-data');

      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
            });
          }, 100000); // 100 seconds
        });
      });

      const promise = audioService.generateSFX(mockUserId, mockProjectId, {
        text: 'Test',
      });

      jest.advanceTimersByTime(90000);

      await expect(promise).rejects.toThrow('SFX generation timeout after 90s');
    });
  });

  describe('generateSFX: Error Cases', () => {
    it('should throw error when API key is not set', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      await expect(
        audioService.generateSFX(mockUserId, mockProjectId, {
          text: 'Test',
        })
      ).rejects.toThrow('ElevenLabs API key not configured');
    });

    it('should handle ElevenLabs SFX API error', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Content policy violation'),
      });

      await expect(
        audioService.generateSFX(mockUserId, mockProjectId, {
          text: 'Test',
        })
      ).rejects.toThrow('ElevenLabs SFX API error: Content policy violation');
    });
  });

  describe('generateMusic: Not Implemented', () => {
    it('should throw not implemented error', async () => {
      await expect(
        audioService.generateMusic(mockUserId, mockProjectId, {
          prompt: 'Upbeat electronic',
        })
      ).rejects.toThrow('Music generation not yet implemented');
    });
  });

  describe('deleteAudio: Success Cases', () => {
    it('should delete audio asset and storage file', async () => {
      const assetId = 'asset-123';
      const storageUrl = `supabase://assets/${mockUserId}/${mockProjectId}/audio/test.mp3`;

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          storage_url: storageUrl,
          type: 'audio',
        },
        error: null,
      });

      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          remove: mockRemove,
        }),
      } as any;

      await audioService.deleteAudio(assetId, mockUserId);

      expect(mockRemove).toHaveBeenCalledWith([`${mockUserId}/${mockProjectId}/audio/test.mp3`]);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it('should continue deletion even if storage delete fails', async () => {
      const assetId = 'asset-123';

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          storage_url: 'supabase://assets/path/to/audio.mp3',
          type: 'audio',
        },
        error: null,
      });

      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: 'File not found' },
      });
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          remove: mockRemove,
        }),
      } as any;

      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      await audioService.deleteAudio(assetId, mockUserId);

      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(serverLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteAudio: Error Cases', () => {
    it('should throw error on invalid asset ID', async () => {
      await expect(audioService.deleteAudio('invalid', mockUserId)).rejects.toThrow('Invalid UUID');
    });

    it('should throw error when asset not found', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(audioService.deleteAudio('asset-123', mockUserId)).rejects.toThrow(
        'Audio asset not found or access denied'
      );
    });

    it('should throw error when user does not own asset', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(audioService.deleteAudio('asset-123', mockUserId)).rejects.toThrow(
        'Audio asset not found or access denied'
      );
    });

    it('should handle database deletion error', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          storage_url: 'supabase://assets/path/audio.mp3',
          type: 'audio',
        },
        error: null,
      });

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          remove: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any;

      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error' },
      });

      await expect(audioService.deleteAudio('asset-123', mockUserId)).rejects.toThrow(
        'Failed to delete audio asset: Database error'
      );

      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log TTS generation start', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('data').buffer),
      });

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset' },
        error: null,
      });

      await audioService.generateTTS(mockUserId, mockProjectId, {
        text: 'Test',
      });

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audio.service.tts_started',
          userId: mockUserId,
          projectId: mockProjectId,
        }),
        'Starting TTS generation'
      );
    });

    it('should log SFX generation start', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('data').buffer),
      });

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.insert.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: { id: 'asset' },
        error: null,
      });

      await audioService.generateSFX(mockUserId, mockProjectId, {
        text: 'Thunder',
        duration: 5,
      });

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'audio.service.sfx_started',
          duration: 5,
        }),
        'Starting SFX generation'
      );
    });
  });
});
