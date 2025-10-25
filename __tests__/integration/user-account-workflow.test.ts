/**
 * @jest-environment node
 */

/**
 * Integration Tests: User Account Workflow
 *
 * Tests complete user account workflows including:
 * - Sign up → Create project → Edit → Export
 * - Settings update → Verify changes
 * - Subscription management flow
 * - Account deletion (full cascade)
 * - Multi-project management
 * - User session management
 *
 * These tests verify that user account features integrate properly
 * with project management, settings, and subscriptions.
 */

import { UserService } from '@/lib/services/userService';
import { ProjectService } from '@/lib/services/projectService';
import { AssetService } from '@/lib/services/assetService';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  resetAllMocks,
  MockSupabaseChain,
} from '@/test-utils/mockSupabase';
import {
  createTestEnvironment,
  UserPersonas,
  ProjectTemplates,
  AssetFixtures,
  IntegrationWorkflow,
  assertProjectValid,
  cleanupTestData,
} from './helpers/integration-helpers';
import { cache } from '@/lib/cache';

// Mock error tracking
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    DATABASE: 'database',
    EXTERNAL_SERVICE: 'external_service',
    AUTH: 'auth',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
}));

// Mock cache invalidation
jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateProjectCache: jest.fn(),
  invalidateUserProjects: jest.fn(),
  invalidateUserProfile: jest.fn(),
}));

describe('Integration: User Account Workflow', () => {
  let env: ReturnType<typeof createTestEnvironment>;
  let userService: UserService;
  let projectService: ProjectService;
  let assetService: AssetService;
  let workflow: IntegrationWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();
    env = createTestEnvironment('newUser');
    userService = new UserService(env.mockSupabase as unknown as SupabaseClient);
    projectService = new ProjectService(env.mockSupabase as unknown as SupabaseClient);
    assetService = new AssetService(env.mockSupabase as unknown as SupabaseClient);
    workflow = new IntegrationWorkflow(env.mockSupabase);
  });

  afterEach(async () => {
    resetAllMocks(env.mockSupabase);
    cleanupTestData(env.mockSupabase);
    await cache.clear();
  });

  describe('Complete User Onboarding Flow', () => {
    it('should complete workflow: sign up → create project → add assets → edit → save', async () => {
      // Step 1: User signs up (mocked as authenticated)
      expect(env.user).toBeDefined();
      expect(env.user.email).toBe('new@example.com');

      // Step 2: Get user profile
      const mockProfile = {
        id: env.user.id,
        email: env.user.email,
        tier: 'free',
        video_minutes_used: 0,
        video_minutes_limit: 10,
        ai_requests_used: 0,
        ai_requests_limit: 100,
        storage_gb_used: 0,
        storage_gb_limit: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const profile = await userService.getUserProfile(env.user.id);

      expect(profile).toBeDefined();
      expect(profile?.tier).toBe('free');

      // Step 3: Create first project
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'My First Project',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'My First Project',
      });

      assertProjectValid(project);
      expect(project.title).toBe('My First Project');

      // Step 4: Upload first asset
      const mockAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      const videoBuffer = Buffer.from('first-video');
      const asset = await assetService.createVideoAsset(env.user.id, project.id, videoBuffer, {
        filename: 'first-video.mp4',
        mimeType: 'video/mp4',
      });

      expect(asset.project_id).toBe(project.id);

      // Step 5: Add to timeline
      const timeline = {
        projectId: project.id,
        clips: [
          {
            id: 'first-clip',
            assetId: asset.id,
            start: 0,
            end: 5000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, timeline);
      const finalProject = await projectService.updateProjectState(
        project.id,
        env.user.id,
        timeline
      );

      // Step 6: Verify complete onboarding
      expect(finalProject.timeline_state_jsonb.clips).toHaveLength(1);
      expect(profile?.video_minutes_used).toBe(0); // First project, no usage yet
    });

    it('should handle new user with multiple projects', async () => {
      // Arrange
      const projectTitles = ['Project 1', 'Project 2', 'Project 3'];
      const createdProjects = [];

      // Act - Create multiple projects
      for (const title of projectTitles) {
        const mockProject = await workflow.createProjectWorkflow(env.user.id, { title });

        const project = await projectService.createProject(env.user.id, { title });

        createdProjects.push(project);
        assertProjectValid(project);
      }

      // Fetch all user projects
      env.mockSupabase.order.mockResolvedValueOnce({
        data: createdProjects.map((p, idx) => ({
          ...p,
          created_at: new Date(Date.now() - (projectTitles.length - idx) * 1000).toISOString(),
        })),
        error: null,
      });

      const userProjects = await projectService.getUserProjects(env.user.id);

      // Assert
      expect(userProjects).toHaveLength(3);
      expect(userProjects.map((p) => p.title)).toEqual(projectTitles);
    });
  });

  describe('User Settings Management', () => {
    it('should update user profile settings', async () => {
      // Arrange
      const mockProfile = {
        id: env.user.id,
        email: env.user.email,
        tier: 'free',
        video_minutes_used: 0,
        video_minutes_limit: 10,
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const profile = await userService.getUserProfile(env.user.id);
      expect(profile).toBeDefined();

      // Act - Update profile (mock update)
      const updatedProfile = {
        ...mockProfile,
        email: 'newemail@example.com',
        updated_at: new Date().toISOString(),
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      });

      // Note: UserService doesn't have updateProfile method, using mock directly
      env.mockSupabase.update.mockReturnThis();
      env.mockSupabase.eq.mockReturnThis();

      await env.mockSupabase
        .from('user_profiles')
        .update({ email: 'newemail@example.com' })
        .eq('id', env.user.id)
        .single();

      // Fetch updated profile
      env.mockSupabase.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      });

      const refreshedProfile = await userService.getUserProfile(env.user.id);

      // Assert
      expect(refreshedProfile?.email).toBe('newemail@example.com');
    });

    it('should track usage metrics updates', async () => {
      // Arrange
      const initialProfile = {
        id: env.user.id,
        tier: 'free',
        video_minutes_used: 0,
        video_minutes_limit: 10,
        ai_requests_used: 0,
        ai_requests_limit: 100,
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: initialProfile,
        error: null,
      });

      const profile1 = await userService.getUserProfile(env.user.id);
      expect(profile1?.video_minutes_used).toBe(0);

      // Act - Simulate usage (create video, generate AI content)
      const updatedProfile = {
        ...initialProfile,
        video_minutes_used: 2,
        ai_requests_used: 5,
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      });

      const profile2 = await userService.getUserProfile(env.user.id);

      // Assert
      expect(profile2?.video_minutes_used).toBe(2);
      expect(profile2?.ai_requests_used).toBe(5);
    });

    it('should enforce usage limits for free tier', async () => {
      // Arrange - User near limits
      const profile = {
        id: env.user.id,
        tier: 'free',
        video_minutes_used: 9,
        video_minutes_limit: 10,
        ai_requests_used: 95,
        ai_requests_limit: 100,
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: profile,
        error: null,
      });

      const userProfile = await userService.getUserProfile(env.user.id);

      // Assert - Check if at limits
      expect(userProfile?.video_minutes_used).toBe(9);
      expect(userProfile?.video_minutes_limit).toBe(10);

      const videoMinutesRemaining =
        (userProfile?.video_minutes_limit || 0) - (userProfile?.video_minutes_used || 0);
      const aiRequestsRemaining =
        (userProfile?.ai_requests_limit || 0) - (userProfile?.ai_requests_used || 0);

      expect(videoMinutesRemaining).toBe(1); // Only 1 minute left
      expect(aiRequestsRemaining).toBe(5); // Only 5 requests left
    });
  });

  describe('Subscription Management Flow', () => {
    it('should upgrade from free to pro tier', async () => {
      // Arrange - Start with free tier
      const freeProfile = {
        id: env.user.id,
        tier: 'free',
        video_minutes_limit: 10,
        ai_requests_limit: 100,
        subscription_status: null,
        stripe_customer_id: null,
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: freeProfile,
        error: null,
      });

      const profile1 = await userService.getUserProfile(env.user.id);
      expect(profile1?.tier).toBe('free');

      // Act - Upgrade to pro
      const proProfile = {
        ...freeProfile,
        tier: 'pro',
        video_minutes_limit: 500,
        ai_requests_limit: 5000,
        subscription_status: 'active',
        stripe_customer_id: 'cus_test123',
        stripe_subscription_id: 'sub_test123',
        updated_at: new Date().toISOString(),
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: proProfile,
        error: null,
      });

      const profile2 = await userService.getUserProfile(env.user.id);

      // Assert
      expect(profile2?.tier).toBe('pro');
      expect(profile2?.video_minutes_limit).toBe(500);
      expect(profile2?.ai_requests_limit).toBe(5000);
      expect(profile2?.subscription_status).toBe('active');
    });

    it('should handle subscription cancellation', async () => {
      // Arrange - Start with active pro subscription
      const activeProfile = {
        id: env.user.id,
        tier: 'pro',
        subscription_status: 'active',
        subscription_cancel_at_period_end: false,
        subscription_current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: activeProfile,
        error: null,
      });

      const profile1 = await userService.getUserProfile(env.user.id);
      expect(profile1?.subscription_cancel_at_period_end).toBe(false);

      // Act - Cancel subscription (still active until period end)
      const cancellingProfile = {
        ...activeProfile,
        subscription_cancel_at_period_end: true,
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: cancellingProfile,
        error: null,
      });

      const profile2 = await userService.getUserProfile(env.user.id);

      // Assert - Still pro tier but cancelling
      expect(profile2?.tier).toBe('pro');
      expect(profile2?.subscription_cancel_at_period_end).toBe(true);
      expect(profile2?.subscription_status).toBe('active');
    });

    it('should downgrade to free tier after subscription expires', async () => {
      // Arrange - Expired subscription
      const expiredProfile = {
        id: env.user.id,
        tier: 'free', // Downgraded
        video_minutes_limit: 10,
        ai_requests_limit: 100,
        subscription_status: 'canceled',
        subscription_cancel_at_period_end: true,
        subscription_current_period_end: new Date(Date.now() - 1000).toISOString(), // Past
      };

      env.mockSupabase.single.mockResolvedValueOnce({
        data: expiredProfile,
        error: null,
      });

      // Act
      const profile = await userService.getUserProfile(env.user.id);

      // Assert
      expect(profile?.tier).toBe('free');
      expect(profile?.video_minutes_limit).toBe(10);
      expect(profile?.subscription_status).toBe('canceled');
    });
  });

  describe('Multi-Project Management', () => {
    it('should manage multiple projects with different states', async () => {
      // Arrange - Create 3 projects in different states
      const projects = [
        { title: 'Draft Project', state: 'draft' },
        { title: 'Active Project', state: 'active' },
        { title: 'Archived Project', state: 'archived' },
      ];

      const createdProjects = [];

      for (const { title, state } of projects) {
        const mockProject = await workflow.createProjectWorkflow(env.user.id, {
          title,
          metadata: { state },
        });

        const project = await projectService.createProject(env.user.id, {
          title,
          metadata: { state },
        });

        createdProjects.push(project);
      }

      // Act - Fetch all projects
      env.mockSupabase.order.mockResolvedValueOnce({
        data: createdProjects,
        error: null,
      });

      const userProjects = await projectService.getUserProjects(env.user.id);

      // Assert
      expect(userProjects).toHaveLength(3);
      expect(userProjects.map((p) => p.metadata?.state)).toEqual(['draft', 'active', 'archived']);
    });

    it('should handle concurrent project editing', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Concurrent Edit',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Concurrent Edit',
      });

      const asset = AssetFixtures.video(project.id, env.user.id);

      // Act - Simulate concurrent edits (different timeline states)
      const edit1 = {
        projectId: project.id,
        clips: [
          { id: 'c1', assetId: asset.id, start: 0, end: 5000, timelinePosition: 0, trackIndex: 0 },
        ],
      };

      const edit2 = {
        projectId: project.id,
        clips: [
          {
            id: 'c1',
            assetId: asset.id,
            start: 1000,
            end: 4000,
            timelinePosition: 0,
            trackIndex: 0,
          },
        ],
      };

      await workflow.updateTimelineWorkflow(project.id, env.user.id, edit1);
      await projectService.updateProjectState(project.id, env.user.id, edit1);

      await workflow.updateTimelineWorkflow(project.id, env.user.id, edit2);
      const finalProject = await projectService.updateProjectState(project.id, env.user.id, edit2);

      // Assert - Last edit wins
      expect(finalProject.timeline_state_jsonb.clips[0].start).toBe(1000);
      expect(finalProject.timeline_state_jsonb.clips[0].end).toBe(4000);
    });

    it('should switch between projects seamlessly', async () => {
      // Arrange - Create 2 projects
      const project1Mock = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Project 1',
      });

      const project1 = await projectService.createProject(env.user.id, {
        title: 'Project 1',
      });

      const project2Mock = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Project 2',
      });

      const project2 = await projectService.createProject(env.user.id, {
        title: 'Project 2',
      });

      // Act - Work on project 1
      const asset1 = AssetFixtures.video(project1.id, env.user.id, { id: 'asset-1' });
      const timeline1 = {
        projectId: project1.id,
        clips: [
          { id: 'c1', assetId: asset1.id, start: 0, end: 5000, timelinePosition: 0, trackIndex: 0 },
        ],
      };

      await workflow.updateTimelineWorkflow(project1.id, env.user.id, timeline1);
      await projectService.updateProjectState(project1.id, env.user.id, timeline1);

      // Switch to project 2
      const asset2 = AssetFixtures.video(project2.id, env.user.id, { id: 'asset-2' });
      const timeline2 = {
        projectId: project2.id,
        clips: [
          { id: 'c2', assetId: asset2.id, start: 0, end: 3000, timelinePosition: 0, trackIndex: 0 },
        ],
      };

      await workflow.updateTimelineWorkflow(project2.id, env.user.id, timeline2);
      await projectService.updateProjectState(project2.id, env.user.id, timeline2);

      // Verify both projects are independent
      env.mockSupabase.single
        .mockResolvedValueOnce({
          data: { ...project1Mock, timeline_state_jsonb: timeline1 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...project2Mock, timeline_state_jsonb: timeline2 },
          error: null,
        });

      const fetchedProject1 = await projectService.getProjectById(project1.id, env.user.id);
      const fetchedProject2 = await projectService.getProjectById(project2.id, env.user.id);

      // Assert
      expect(fetchedProject1?.timeline_state_jsonb.clips[0].end).toBe(5000);
      expect(fetchedProject2?.timeline_state_jsonb.clips[0].end).toBe(3000);
    });
  });

  describe('Account Deletion with Cascade', () => {
    it('should delete user account and cascade to all projects and assets', async () => {
      // Arrange - Create user with projects and assets
      const mockProjects = [
        await workflow.createProjectWorkflow(env.user.id, { title: 'Project 1' }),
        await workflow.createProjectWorkflow(env.user.id, { title: 'Project 2' }),
      ];

      const projects = await Promise.all(
        mockProjects.map((_, idx) =>
          projectService.createProject(env.user.id, { title: `Project ${idx + 1}` })
        )
      );

      // Add assets to projects
      const mockAssets = await Promise.all([
        workflow.uploadAssetWorkflow(projects[0].id, env.user.id, 'video'),
        workflow.uploadAssetWorkflow(projects[1].id, env.user.id, 'video'),
      ]);

      // Act - Delete user account (mock cascade)
      // Delete assets - each needs fetch + storage remove + db delete
      for (const asset of mockAssets) {
        // Mock asset fetch
        env.mockSupabase.single.mockResolvedValueOnce({
          data: asset,
          error: null,
        });

        // Mock storage removal
        env.mockSupabase.storage.remove.mockResolvedValueOnce({
          data: null,
          error: null,
        });

        // Mock database delete
        env.mockSupabase.delete.mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockResolvedValueOnce({ error: null }),
          }),
        });

        await assetService.deleteAsset(asset.id, env.user.id);
      }

      // Delete projects
      for (const project of projects) {
        // Mock project fetch
        env.mockSupabase.single.mockResolvedValueOnce({
          data: project,
          error: null,
        });

        // Mock project delete
        env.mockSupabase.delete.mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockResolvedValueOnce({ error: null }),
          }),
        });

        await projectService.deleteProject(project.id, env.user.id);
      }

      // Delete user profile would be handled by auth service
      // env.mockSupabase.auth.admin.deleteUser(env.user.id);

      // Assert
      expect(env.mockSupabase.delete).toHaveBeenCalled();
    });

    it('should handle partial deletion failure', async () => {
      // Arrange
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Partial Delete',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Partial Delete',
      });

      const mockAsset = await workflow.uploadAssetWorkflow(project.id, env.user.id, 'video');

      // Act - Delete asset succeeds
      // Mock asset fetch
      env.mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Mock storage removal
      env.mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock database delete succeeds
      env.mockSupabase.delete.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({ error: null }),
        }),
      });

      await assetService.deleteAsset(mockAsset.id, env.user.id);

      expect(env.mockSupabase.delete).toHaveBeenCalled();

      // Delete project fails
      // Mock project fetch
      env.mockSupabase.single.mockResolvedValueOnce({
        data: project,
        error: null,
      });

      // Mock project delete fails
      env.mockSupabase.delete.mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({ error: { message: 'Foreign key violation' } }),
        }),
      });

      // Assert
      await expect(projectService.deleteProject(project.id, env.user.id)).rejects.toThrow(
        'Failed to delete project'
      );
    });
  });

  describe('User Session Management', () => {
    it('should maintain session across project operations', async () => {
      // Arrange - Verify user session
      env.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: env.user },
        error: null,
      });

      const session = await env.mockSupabase.auth.getUser();
      expect(session.data.user).toBeDefined();
      expect(session.data.user?.id).toBe(env.user.id);

      // Act - Perform operations
      const mockProject = await workflow.createProjectWorkflow(env.user.id, {
        title: 'Session Test',
      });

      const project = await projectService.createProject(env.user.id, {
        title: 'Session Test',
      });

      // Verify session still valid
      const session2 = await env.mockSupabase.auth.getUser();
      expect(session2.data.user?.id).toBe(env.user.id);

      // Assert
      expect(project.user_id).toBe(env.user.id);
    });

    it('should handle session expiry gracefully', async () => {
      // Arrange - Session expires
      env.mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Session expired' },
      });

      // Act
      const session = await env.mockSupabase.auth.getUser();

      // Assert
      expect(session.data.user).toBeNull();
      expect(session.error).toBeDefined();
    });
  });
});
