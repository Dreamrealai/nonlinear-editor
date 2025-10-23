/**
 * Project Service Layer
 *
 * Handles all business logic related to projects:
 * - Creating projects
 * - Fetching projects
 * - Updating projects
 * - Deleting projects
 * - Project ownership verification
 *
 * This service layer separates business logic from API route handlers,
 * making code more testable and maintainable.
 *
 * Usage:
 * ```typescript
 * import { ProjectService } from '@/lib/services/projectService';
 *
 * const service = new ProjectService(supabase);
 * const project = await service.createProject(userId, 'My Project');
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';
import { validateUUID } from '../validation';
import { isPostgresNotFound } from '../errors/errorCodes';
import { cache, CacheKeys, CacheTTL } from '../cache';
import { invalidateProjectCache, invalidateUserProjects } from '../cacheInvalidation';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  timeline_state_jsonb: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectOptions {
  title?: string;
  initialState?: Record<string, unknown>;
}

export class ProjectService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new project and invalidate user projects cache
   */
  async createProject(userId: string, options: CreateProjectOptions = {}): Promise<Project> {
    const { title = 'Untitled Project', initialState = {} } = options;

    try {
      const { data: project, error: dbError } = await this.supabase
        .from('projects')
        .insert({
          title,
          user_id: userId,
          timeline_state_jsonb: initialState,
        })
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: { userId, title },
        });
        throw new Error(`Failed to create project: ${dbError.message}`);
      }

      if (!project) {
        throw new Error('Project creation returned no data');
      }

      // Invalidate user's projects list cache
      await invalidateUserProjects(userId);

      return project as Project;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { userId, title },
      });
      throw error;
    }
  }

  /**
   * Get all projects for a user with caching
   *
   * Retrieves user projects from cache if available,
   * otherwise fetches from database and caches the result.
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      // Try cache first
      const cacheKey = CacheKeys.userProjects(userId);
      const cached = await cache.get<Project[]>(cacheKey);

      if (cached) {
        return cached;
      }

      // Fetch from database
      const { data: projects, error: dbError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { userId },
        });
        throw new Error(`Failed to fetch projects: ${dbError.message}`);
      }

      const projectsList = (projects || []) as Project[];

      // Cache the result
      await cache.set(cacheKey, projectsList, CacheTTL.userProjects);

      return projectsList;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId },
      });
      throw error;
    }
  }

  /**
   * Get a single project by ID with caching
   *
   * Retrieves project from cache if available,
   * otherwise fetches from database and caches the result.
   */
  async getProjectById(projectId: string, userId: string): Promise<Project | null> {
    try {
      validateUUID(projectId, 'Project ID');

      // Try cache first
      const cacheKey = CacheKeys.projectMetadata(projectId);
      const cached = await cache.get<Project>(cacheKey);

      if (cached && cached.user_id === userId) {
        return cached;
      }

      // Fetch from database
      const { data: project, error: dbError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (dbError) {
        if (isPostgresNotFound(dbError)) {
          // Not found
          return null;
        }
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { projectId, userId },
        });
        throw new Error(`Failed to fetch project: ${dbError.message}`);
      }

      // Cache the result
      await cache.set(cacheKey, project as Project, CacheTTL.projectMetadata);

      return project as Project;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { projectId, userId },
      });
      throw error;
    }
  }

  /**
   * Verify that a user owns a project
   */
  async verifyOwnership(projectId: string, userId: string): Promise<boolean> {
    try {
      validateUUID(projectId, 'Project ID');

      const { data: project, error: dbError } = await this.supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (dbError) {
        if (isPostgresNotFound(dbError)) {
          // Not found
          return false;
        }
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { projectId, userId },
        });
        return false;
      }

      return Boolean(project);
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { projectId, userId },
      });
      return false;
    }
  }

  /**
   * Update project title and invalidate cache
   */
  async updateProjectTitle(projectId: string, userId: string, title: string): Promise<Project> {
    try {
      validateUUID(projectId, 'Project ID');

      const { data: project, error: dbError } = await this.supabase
        .from('projects')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { projectId, userId, title },
        });
        throw new Error(`Failed to update project: ${dbError.message}`);
      }

      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Invalidate caches
      await invalidateProjectCache(projectId, userId);

      return project as Project;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { projectId, userId, title },
      });
      throw error;
    }
  }

  /**
   * Delete a project and invalidate cache
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    try {
      validateUUID(projectId, 'Project ID');

      const { error: dbError } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: { projectId, userId },
        });
        throw new Error(`Failed to delete project: ${dbError.message}`);
      }

      // Invalidate caches
      await invalidateProjectCache(projectId, userId);
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { projectId, userId },
      });
      throw error;
    }
  }

  /**
   * Update project state and invalidate cache
   */
  async updateProjectState(
    projectId: string,
    userId: string,
    state: Record<string, unknown>
  ): Promise<Project> {
    try {
      validateUUID(projectId, 'Project ID');

      const { data: project, error: dbError } = await this.supabase
        .from('projects')
        .update({
          timeline_state_jsonb: state,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { projectId, userId },
        });
        throw new Error(`Failed to update project state: ${dbError.message}`);
      }

      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Invalidate caches
      await invalidateProjectCache(projectId, userId);

      return project as Project;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { projectId, userId },
      });
      throw error;
    }
  }

  /**
   * Get all projects (admin only)
   */
  async getAllProjects(): Promise<Project[]> {
    try {
      const { data: projects, error: dbError } = await this.supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: {},
        });
        throw new Error(`Failed to fetch all projects: ${dbError.message}`);
      }

      return (projects || []) as Project[];
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: {},
      });
      throw error;
    }
  }
}
