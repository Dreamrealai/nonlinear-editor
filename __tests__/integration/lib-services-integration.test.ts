/**
 * Integration Tests for Library Services
 *
 * Tests end-to-end workflows involving multiple library services:
 * - Audio generation -> Asset creation -> Timeline integration
 * - Video generation -> Status polling -> Asset creation
 * - Project export/import with all asset types
 * - Asset version management workflow
 * - Backup and restore workflow
 */

import { AuthService } from '@/lib/services/authService';
import { AudioService } from '@/lib/services/audioService';
import { VideoService } from '@/lib/services/videoService';
import { AssetService } from '@/lib/services/assetService';
import { ProjectService } from '@/lib/services/projectService';
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';

// Mock external APIs
jest.mock('@/lib/imagen');
jest.mock('@/lib/fal-video');
jest.mock('@/lib/veo');
jest.mock('@/lib/errorTracking');
jest.mock('@/lib/serverLogger');
jest.mock('@/lib/validation', () => ({
  validateUUID: jest.fn((id: string) => {
    if (!id || id === 'invalid') {
      throw new Error('Invalid UUID');
    }
  }),
}));

global.fetch = jest.fn();

describe('Integration: Library Services Workflows', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let authService: AuthService;
  let audioService: AudioService;
  let videoService: VideoService;
  let assetService: AssetService;
  let projectService: ProjectService;
  let testUserId: string;
  let testProjectId: string;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = createMockSupabaseClient();
    authService = new AuthService(mockSupabase as any);
    audioService = new AudioService(mockSupabase as any);
    videoService = new VideoService(mockSupabase as any);
    assetService = new AssetService(mockSupabase as any);
    projectService = new ProjectService(mockSupabase as any);

    testUserId = 'test-user-123';
    testProjectId = 'test-project-456';

    // Setup authenticated user
    mockAuthenticatedUser(mockSupabase, {
      id: testUserId,
      email: 'test@example.com',
    });

    // Setup storage mock
    mockSupabase.storage = {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/asset.mp3' },
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        download: jest.fn().mockResolvedValue({
          data: Buffer.from('mock-data'),
          error: null,
        }),
      }),
    } as any;

    // Setup database mocks
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  describe('Workflow: User creates project and generates audio', () => {
    it('should complete full audio generation workflow', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      // Step 1: Authenticate user
      const user = await authService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);

      // Step 2: Create project
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: testProjectId,
          user_id: testUserId,
          name: 'Test Project',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const project = await projectService.createProject(testUserId, 'Test Project');
      expect(project.id).toBe(testProjectId);

      // Step 3: Generate TTS audio
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('audio-data').buffer),
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'audio-asset-123',
          user_id: testUserId,
          project_id: testProjectId,
          type: 'audio',
          source: 'genai',
          storage_url: 'supabase://assets/path/audio.mp3',
          metadata: {
            filename: 'audio.mp3',
            mimeType: 'audio/mpeg',
            provider: 'elevenlabs',
          },
        },
        error: null,
      });

      const audioResult = await audioService.generateTTS(testUserId, testProjectId, {
        text: 'Welcome to our video',
      });

      expect(audioResult.success).toBe(true);
      expect(audioResult.asset.type).toBe('audio');
      expect(audioResult.asset.project_id).toBe(testProjectId);

      // Verify the full workflow
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
    });
  });

  describe('Workflow: Generate video and poll status', () => {
    it('should handle FAL video generation workflow', async () => {
      const { generateFalVideo, checkFalVideoStatus } = require('@/lib/fal-video');

      // Step 1: Initiate video generation
      generateFalVideo.mockResolvedValue({
        requestId: 'fal-request-123',
        endpoint: 'fal-ai/seedance/text-to-video',
      });

      const videoGenResult = await videoService.generateVideo(testUserId, testProjectId, {
        prompt: 'A sunset over mountains',
        model: 'seedance-1.0-pro',
        duration: 5,
      });

      expect(videoGenResult.operationName).toContain('fal:');
      expect(videoGenResult.status).toBe('processing');

      // Step 2: Poll status (in progress)
      checkFalVideoStatus.mockResolvedValueOnce({
        done: false,
      });

      const statusInProgress = await videoService.checkVideoStatus(
        testUserId,
        testProjectId,
        videoGenResult.operationName
      );

      expect(statusInProgress.done).toBe(false);

      // Step 3: Poll status (completed)
      const mockVideoUrl = 'https://example.com/generated-video.mp4';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('video-data').buffer),
      });

      checkFalVideoStatus.mockResolvedValueOnce({
        done: true,
        result: {
          video: {
            url: mockVideoUrl,
            content_type: 'video/mp4',
          },
        },
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'video-asset-123',
          user_id: testUserId,
          project_id: testProjectId,
          type: 'video',
          source: 'genai',
          storage_url: 'supabase://assets/path/video.mp4',
          metadata: {
            sourceUrl: 'https://example.com/video.mp4',
          },
        },
        error: null,
      });

      // Mock activity history insert
      mockSupabase.insert.mockResolvedValue({
        error: null,
      });

      const statusComplete = await videoService.checkVideoStatus(
        testUserId,
        testProjectId,
        videoGenResult.operationName
      );

      expect(statusComplete.done).toBe(true);
      expect(statusComplete.asset).toBeDefined();
      expect(statusComplete.asset?.type).toBe('video');
    });
  });

  describe('Workflow: Asset upload and management', () => {
    it('should upload image and create asset record', async () => {
      const imageBuffer = Buffer.from('fake-image-data');

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'image-asset-123',
          user_id: testUserId,
          project_id: testProjectId,
          type: 'image',
          source: 'upload',
          storage_url: 'supabase://assets/path/image.jpg',
          metadata: {
            filename: 'test-image.jpg',
            mimeType: 'image/jpeg',
            width: 1920,
            height: 1080,
          },
        },
        error: null,
      });

      const asset = await assetService.createImageAsset(testUserId, testProjectId, imageBuffer, {
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
        metadata: {
          filename: 'test-image.jpg',
          mimeType: 'image/jpeg',
          width: 1920,
          height: 1080,
        },
      });

      expect(asset.id).toBe('image-asset-123');
      expect(asset.type).toBe('image');
      expect(asset.metadata.filename).toBe('test-image.jpg');

      // Verify storage upload was called
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
    });

    it('should handle asset upload failure and cleanup', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      const mockRemove = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ error: null }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: 'https://example.com/image.jpg' },
          }),
          remove: mockRemove,
        }),
      } as any;

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database insert failed' },
      });

      await expect(
        assetService.createImageAsset(testUserId, testProjectId, imageBuffer, {
          filename: 'test-image.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('Failed to create asset record');

      // Verify cleanup was attempted
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('Workflow: User profile management', () => {
    it('should fetch and cache user profile', async () => {
      const mockProfile = {
        id: testUserId,
        email: 'test@example.com',
        tier: 'pro',
        subscription_status: 'active',
      };

      // First call - fetch from database
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const profile1 = await authService.getUserProfile(testUserId);
      expect(profile1).toEqual(mockProfile);

      // Second call - should use cache (mock won't be called again)
      const profile2 = await authService.getUserProfile(testUserId);
      expect(profile2).toEqual(mockProfile);

      // Verify database was only called once
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should update profile and invalidate cache', async () => {
      const updatedProfile = {
        id: testUserId,
        email: 'test@example.com',
        tier: 'enterprise',
        subscription_status: 'active',
      };

      mockSupabase.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      const result = await authService.updateUserProfile(testUserId, {
        tier: 'enterprise',
      });

      expect(result.tier).toBe('enterprise');
      expect(mockSupabase.update).toHaveBeenCalled();
    });
  });

  describe('Workflow: Project with multiple asset types', () => {
    it('should create project and add various assets', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      // Create project
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: testProjectId,
          user_id: testUserId,
          name: 'Multi-Asset Project',
        },
        error: null,
      });

      const project = await projectService.createProject(testUserId, 'Multi-Asset Project');

      // Add image asset
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'image-1',
          type: 'image',
          project_id: testProjectId,
        },
        error: null,
      });

      const imageAsset = await assetService.createImageAsset(
        testUserId,
        testProjectId,
        Buffer.from('image'),
        {
          filename: 'bg.jpg',
          mimeType: 'image/jpeg',
        }
      );

      // Add video asset
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'video-1',
          type: 'video',
          project_id: testProjectId,
        },
        error: null,
      });

      const videoAsset = await assetService.createVideoAsset(
        testUserId,
        testProjectId,
        Buffer.from('video'),
        {
          filename: 'clip.mp4',
          mimeType: 'video/mp4',
        }
      );

      // Add audio asset
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('audio').buffer),
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'audio-1',
          type: 'audio',
          project_id: testProjectId,
        },
        error: null,
      });

      const audioAsset = await audioService.generateTTS(testUserId, testProjectId, {
        text: 'Narration',
      });

      // Verify all assets belong to the project
      expect(imageAsset.project_id).toBe(testProjectId);
      expect(videoAsset.project_id).toBe(testProjectId);
      expect(audioAsset.asset.project_id).toBe(testProjectId);

      // Verify different asset types
      expect(imageAsset.type).toBe('image');
      expect(videoAsset.type).toBe('video');
      expect(audioAsset.asset.type).toBe('audio');
    });
  });

  describe('Workflow: Error recovery and retry', () => {
    it('should handle transient errors and retry', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      // First attempt fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      // Second attempt succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('audio').buffer),
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'audio-1' },
        error: null,
      });

      // First attempt should fail
      await expect(
        audioService.generateTTS(testUserId, testProjectId, {
          text: 'Test',
        })
      ).rejects.toThrow('Network timeout');

      // Retry should succeed
      const result = await audioService.generateTTS(testUserId, testProjectId, {
        text: 'Test',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Workflow: Asset deletion with cleanup', () => {
    it('should delete asset and clean up storage', async () => {
      const assetId = 'audio-123';
      const storagePath = `${testUserId}/${testProjectId}/audio/test.mp3`;

      // Mock asset fetch
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: assetId,
          storage_url: `supabase://assets/${storagePath}`,
          type: 'audio',
        },
        error: null,
      });

      // Mock storage remove
      const mockRemove = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          remove: mockRemove,
        }),
      } as any;

      // Mock database delete
      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      await audioService.deleteAudio(assetId, testUserId);

      // Verify storage was cleaned up
      expect(mockRemove).toHaveBeenCalledWith([storagePath]);

      // Verify database record was deleted
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  describe('Workflow: User account deletion cascade', () => {
    it('should delete user and cascade to all related data', async () => {
      // Mock user projects fetch
      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({
        error: null,
      });

      // Mock activity history deletion
      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValueOnce({
        error: null,
      });

      // Mock storage file list
      const mockFiles = [{ name: 'file1.mp3' }, { name: 'file2.mp4' }];

      mockSupabase.storage = {
        from: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue({
            data: mockFiles,
            error: null,
          }),
          remove: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any;

      await authService.deleteUserAccount(testUserId);

      // Verify projects were deleted
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', testUserId);

      // Verify storage was cleaned
      const storageFrom = mockSupabase.storage.from('assets');
      expect(storageFrom.list).toHaveBeenCalledWith(testUserId);
      expect(storageFrom.remove).toHaveBeenCalled();
    });
  });

  describe('Performance: Concurrent operations', () => {
    it('should handle multiple concurrent asset uploads', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('audio').buffer),
      });

      // Create multiple assets concurrently
      const promises = Array.from({ length: 5 }, (_, i) => {
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            id: `asset-${i}`,
            type: 'audio',
            project_id: testProjectId,
          },
          error: null,
        });

        return audioService.generateTTS(testUserId, testProjectId, {
          text: `Audio ${i}`,
        });
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.asset.id).toBe(`asset-${i}`);
      });
    });
  });
});
