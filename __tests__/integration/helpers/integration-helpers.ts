/**
 * Integration Test Helpers
 *
 * Utilities for setting up realistic integration test scenarios
 * with proper data fixtures and workflow orchestration.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  createMockAsset,
  MockSupabaseChain,
} from '@/test-utils/mockSupabase';

/**
 * User personas for realistic testing scenarios
 */
export const UserPersonas = {
  /**
   * Free tier user with limited resources
   */
  freeTierUser: () => ({
    id: '550e8400-e29b-41d4-a716-446655440010',
    email: 'free@example.com',
    tier: 'free' as const,
    video_minutes_used: 5,
    video_minutes_limit: 10,
    ai_requests_used: 50,
    ai_requests_limit: 100,
    storage_gb_used: 0.5,
    storage_gb_limit: 2,
  }),

  /**
   * Pro tier user with ample resources
   */
  proTierUser: () => ({
    id: '550e8400-e29b-41d4-a716-446655440011',
    email: 'pro@example.com',
    tier: 'pro' as const,
    video_minutes_used: 30,
    video_minutes_limit: 500,
    ai_requests_used: 200,
    ai_requests_limit: 5000,
    storage_gb_used: 5,
    storage_gb_limit: 100,
  }),

  /**
   * Enterprise tier user with maximum resources
   */
  enterpriseUser: () => ({
    id: '550e8400-e29b-41d4-a716-446655440012',
    email: 'enterprise@example.com',
    tier: 'enterprise' as const,
    video_minutes_used: 100,
    video_minutes_limit: 10000,
    ai_requests_used: 500,
    ai_requests_limit: 50000,
    storage_gb_used: 50,
    storage_gb_limit: 1000,
  }),

  /**
   * New user with no usage
   */
  newUser: () => ({
    id: '550e8400-e29b-41d4-a716-446655440013',
    email: 'new@example.com',
    tier: 'free' as const,
    video_minutes_used: 0,
    video_minutes_limit: 10,
    ai_requests_used: 0,
    ai_requests_limit: 100,
    storage_gb_used: 0,
    storage_gb_limit: 2,
  }),
};

/**
 * Project templates for testing
 */
export const ProjectTemplates = {
  /**
   * Empty project for new workflows
   */
  empty: (userId: string) =>
    createMockProject({
      user_id: userId,
      title: 'Empty Project',
      timeline_state_jsonb: {
        projectId: '',
        clips: [],
      },
    }),

  /**
   * Project with basic video timeline
   */
  basicVideo: (userId: string, assetIds: string[]) =>
    createMockProject({
      user_id: userId,
      title: 'Basic Video Project',
      timeline_state_jsonb: {
        projectId: '',
        clips: assetIds.map((assetId, idx) => ({
          id: `clip-${idx}`,
          assetId,
          start: 0,
          end: 5000,
          timelinePosition: idx * 5000,
          trackIndex: 0,
        })),
        output: {
          width: 1920,
          height: 1080,
          fps: 30,
          vBitrateK: 5000,
          aBitrateK: 192,
          format: 'mp4' as const,
        },
      },
    }),

  /**
   * Complex multi-track project
   */
  multiTrack: (userId: string, videoAssets: string[], audioAssets: string[]) =>
    createMockProject({
      user_id: userId,
      title: 'Multi-Track Project',
      timeline_state_jsonb: {
        projectId: '',
        clips: [
          ...videoAssets.map((assetId, idx) => ({
            id: `video-clip-${idx}`,
            assetId,
            start: 0,
            end: 10000,
            timelinePosition: idx * 10000,
            trackIndex: 0,
          })),
          ...audioAssets.map((assetId, idx) => ({
            id: `audio-clip-${idx}`,
            assetId,
            start: 0,
            end: 10000,
            timelinePosition: idx * 10000,
            trackIndex: 1,
          })),
        ],
      },
    }),

  /**
   * Project with AI-generated content
   */
  aiGenerated: (userId: string) =>
    createMockProject({
      user_id: userId,
      title: 'AI Generated Project',
      timeline_state_jsonb: {
        projectId: '',
        clips: [],
      },
      metadata: {
        hasAIContent: true,
        generationHistory: [],
      },
    }),
};

/**
 * Asset fixtures for testing
 */
export const AssetFixtures = {
  /**
   * Video asset with realistic metadata
   */
  video: (projectId: string, userId: string, overrides = {}) =>
    createMockAsset({
      project_id: projectId,
      user_id: userId,
      type: 'video',
      storage_url: 'supabase://bucket/videos/sample.mp4',
      duration_seconds: 30,
      metadata: {
        filename: 'sample.mp4',
        mimeType: 'video/mp4',
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        bitrate: 5000000,
        thumbnail: 'https://example.com/thumb.jpg',
      },
      ...overrides,
    }),

  /**
   * Audio asset
   */
  audio: (projectId: string, userId: string, overrides = {}) =>
    createMockAsset({
      project_id: projectId,
      user_id: userId,
      type: 'audio',
      storage_url: 'supabase://bucket/audio/sample.mp3',
      duration_seconds: 60,
      metadata: {
        filename: 'sample.mp3',
        mimeType: 'audio/mpeg',
        bitrate: 192000,
        sampleRate: 44100,
        channels: 2,
      },
      ...overrides,
    }),

  /**
   * Image asset
   */
  image: (projectId: string, userId: string, overrides = {}) =>
    createMockAsset({
      project_id: projectId,
      user_id: userId,
      type: 'image',
      storage_url: 'supabase://bucket/images/sample.jpg',
      metadata: {
        filename: 'sample.jpg',
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        size: 2048000,
      },
      ...overrides,
    }),

  /**
   * AI-generated video
   */
  aiVideo: (projectId: string, userId: string, overrides = {}) =>
    createMockAsset({
      project_id: projectId,
      user_id: userId,
      type: 'video',
      storage_url: 'supabase://bucket/ai-videos/generated.mp4',
      duration_seconds: 5,
      metadata: {
        filename: 'generated.mp4',
        mimeType: 'video/mp4',
        width: 1280,
        height: 720,
        aiGenerated: true,
        model: 'veo-3.1-generate-preview',
        prompt: 'A serene lake at sunset',
      },
      ...overrides,
    }),

  /**
   * Batch of test assets
   */
  batch: (
    projectId: string,
    userId: string,
    count: number,
    type: 'video' | 'image' | 'audio' = 'video'
  ) => {
    const fixtures = {
      video: AssetFixtures.video,
      image: AssetFixtures.image,
      audio: AssetFixtures.audio,
    };

    return Array.from({ length: count }, (_, idx) =>
      fixtures[type](projectId, userId, {
        id: `${type}-asset-${idx}`,
        metadata: {
          ...fixtures[type](projectId, userId).metadata,
          filename: `${type}-${idx}.${type === 'video' ? 'mp4' : type === 'image' ? 'jpg' : 'mp3'}`,
        },
      })
    );
  },
};

/**
 * Timeline state builders
 */
export const TimelineBuilders = {
  /**
   * Create simple single-track timeline
   */
  singleTrack: (projectId: string, assets: any[]) => ({
    projectId,
    clips: assets.map((asset, idx) => ({
      id: `clip-${idx}`,
      assetId: asset.id,
      start: 0,
      end: (asset.duration_seconds || 5) * 1000,
      timelinePosition: idx * (asset.duration_seconds || 5) * 1000,
      trackIndex: 0,
    })),
    output: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 192,
      format: 'mp4' as const,
    },
  }),

  /**
   * Create multi-track timeline with video and audio
   */
  multiTrack: (projectId: string, videoAssets: any[], audioAssets: any[]) => ({
    projectId,
    clips: [
      ...videoAssets.map((asset, idx) => ({
        id: `video-clip-${idx}`,
        assetId: asset.id,
        start: 0,
        end: (asset.duration_seconds || 5) * 1000,
        timelinePosition: idx * (asset.duration_seconds || 5) * 1000,
        trackIndex: 0,
      })),
      ...audioAssets.map((asset, idx) => ({
        id: `audio-clip-${idx}`,
        assetId: asset.id,
        start: 0,
        end: (asset.duration_seconds || 5) * 1000,
        timelinePosition: 0,
        trackIndex: 1,
      })),
    ],
    output: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 192,
      format: 'mp4' as const,
    },
  }),

  /**
   * Create timeline with overlapping clips
   */
  overlapping: (projectId: string, assets: any[]) => ({
    projectId,
    clips: assets.map((asset, idx) => ({
      id: `clip-${idx}`,
      assetId: asset.id,
      start: 0,
      end: (asset.duration_seconds || 5) * 1000,
      timelinePosition: idx * 2000, // Overlap clips
      trackIndex: idx % 2, // Alternate tracks
    })),
  }),

  /**
   * Create timeline with trimmed clips
   */
  trimmed: (projectId: string, assets: any[]) => ({
    projectId,
    clips: assets.map((asset, idx) => ({
      id: `clip-${idx}`,
      assetId: asset.id,
      start: 1000, // Trim 1 second from start
      end: ((asset.duration_seconds || 5) - 1) * 1000, // Trim 1 second from end
      timelinePosition: idx * ((asset.duration_seconds || 5) - 2) * 1000,
      trackIndex: 0,
    })),
  }),
};

/**
 * Mock service responses for integration tests
 */
export const MockResponses = {
  /**
   * Successful video generation
   */
  videoGeneration: {
    initiated: {
      operationName: 'operations/test-video-gen-123',
      status: 'processing' as const,
    },
    inProgress: {
      done: false,
      metadata: { progressPercentage: 50 },
    },
    completed: (assetId: string) => ({
      done: true,
      response: {
        videos: [
          {
            bytesBase64Encoded: Buffer.from('mock-video-data').toString('base64'),
            mimeType: 'video/mp4',
          },
        ],
      },
      asset: { id: assetId },
    }),
  },

  /**
   * Successful audio generation
   */
  audioGeneration: {
    initiated: {
      id: 'audio-gen-123',
      status: 'processing' as const,
    },
    completed: (assetId: string) => ({
      id: 'audio-gen-123',
      status: 'completed' as const,
      audioUrl: 'https://example.com/audio.mp3',
      asset: { id: assetId },
    }),
  },

  /**
   * Successful asset upload
   */
  assetUpload: {
    storage: {
      data: { path: 'test-path' },
      error: null,
    },
    publicUrl: {
      data: { publicUrl: 'https://example.com/asset.mp4' },
    },
  },
};

/**
 * Workflow orchestrator for integration tests
 */
export class IntegrationWorkflow {
  private mockSupabase: MockSupabaseChain;
  private services: {
    project?: any;
    asset?: any;
    video?: any;
    audio?: any;
    user?: any;
  };

  constructor(mockSupabase: MockSupabaseChain) {
    this.mockSupabase = mockSupabase;
    this.services = {};
  }

  /**
   * Register services for workflow
   */
  registerServices(services: IntegrationWorkflow['services']) {
    this.services = { ...this.services, ...services };
  }

  /**
   * Complete project creation workflow
   */
  async createProjectWorkflow(userId: string, projectData: any) {
    const mockProject = createMockProject({ user_id: userId, ...projectData });

    this.mockSupabase.single.mockResolvedValueOnce({
      data: mockProject,
      error: null,
    });

    return mockProject;
  }

  /**
   * Complete asset upload workflow
   */
  async uploadAssetWorkflow(
    projectId: string,
    userId: string,
    assetType: 'video' | 'image' | 'audio'
  ) {
    const mockAsset = AssetFixtures[assetType](projectId, userId);

    // Mock storage upload
    this.mockSupabase.storage.upload.mockResolvedValueOnce(MockResponses.assetUpload.storage);
    this.mockSupabase.storage.getPublicUrl.mockReturnValue(MockResponses.assetUpload.publicUrl);

    // Mock asset creation
    this.mockSupabase.single.mockResolvedValueOnce({
      data: mockAsset,
      error: null,
    });

    return mockAsset;
  }

  /**
   * Complete video generation workflow
   */
  async generateVideoWorkflow(projectId: string, userId: string) {
    const mockAsset = AssetFixtures.aiVideo(projectId, userId);

    // Mock storage upload for generated video
    this.mockSupabase.storage.upload.mockResolvedValueOnce(MockResponses.assetUpload.storage);
    this.mockSupabase.storage.getPublicUrl.mockReturnValue(MockResponses.assetUpload.publicUrl);

    // Mock asset creation
    this.mockSupabase.single.mockResolvedValueOnce({
      data: mockAsset,
      error: null,
    });

    return mockAsset;
  }

  /**
   * Complete timeline update workflow
   */
  async updateTimelineWorkflow(projectId: string, userId: string, timelineState: any) {
    const updatedProject = createMockProject({
      id: projectId,
      user_id: userId,
      timeline_state_jsonb: timelineState,
    });

    this.mockSupabase.single.mockResolvedValueOnce({
      data: updatedProject,
      error: null,
    });

    return updatedProject;
  }
}

/**
 * Test data cleanup helper
 */
export function cleanupTestData(mockSupabase: MockSupabaseChain) {
  jest.clearAllMocks();
  // Reset mock implementation states
  if (mockSupabase.from) {
    mockSupabase.from.mockClear();
  }
  if (mockSupabase.storage?.upload) {
    mockSupabase.storage.upload.mockClear();
  }
  if (mockSupabase.auth?.getUser) {
    mockSupabase.auth.getUser.mockClear();
  }
}

/**
 * Create complete test environment
 */
export function createTestEnvironment(userPersona: keyof typeof UserPersonas = 'freeTierUser') {
  const mockSupabase = createMockSupabaseClient();
  const user = createMockUser(UserPersonas[userPersona]());
  const workflow = new IntegrationWorkflow(mockSupabase);

  // Mock authenticated user
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });

  return {
    mockSupabase,
    user,
    workflow,
  };
}

/**
 * Assert timeline validity
 */
export function assertTimelineValid(timeline: any) {
  expect(timeline).toBeDefined();
  expect(timeline.projectId).toBeDefined();
  expect(Array.isArray(timeline.clips)).toBe(true);

  // Validate each clip
  timeline.clips.forEach((clip: any, idx: number) => {
    expect(clip.id).toBeDefined();
    expect(clip.assetId).toBeDefined();
    expect(typeof clip.start).toBe('number');
    expect(typeof clip.end).toBe('number');
    expect(typeof clip.timelinePosition).toBe('number');
    expect(typeof clip.trackIndex).toBe('number');
    expect(clip.end).toBeGreaterThan(clip.start);
  });
}

/**
 * Assert project state validity
 */
export function assertProjectValid(project: any) {
  expect(project).toBeDefined();
  expect(project.id).toBeDefined();
  expect(project.user_id).toBeDefined();
  expect(project.title).toBeDefined();
  expect(project.created_at).toBeDefined();
  expect(project.updated_at).toBeDefined();
}

/**
 * Assert asset validity
 */
export function assertAssetValid(asset: any) {
  expect(asset).toBeDefined();
  expect(asset.id).toBeDefined();
  expect(asset.project_id).toBeDefined();
  expect(asset.user_id).toBeDefined();
  expect(asset.type).toBeDefined();
  expect(asset.storage_url).toBeDefined();
  expect(asset.metadata).toBeDefined();
}
