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
   * Create a new project
   */
  async createProject(
    userId: string,
    options: CreateProjectOptions = {}
  ): Promise<Project> {
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
   * Get all projects for a user
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    try {
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

      return (projects || []) as Project[];
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
   * Get a single project by ID
   */
  async getProjectById(projectId: string, userId: string): Promise<Project | null> {
    try {
      validateUUID(projectId, 'Project ID');

      const { data: project, error: dbError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116') {
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
        if (dbError.code === 'PGRST116') {
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
   * Update project title
   */
  async updateProjectTitle(
    projectId: string,
    userId: string,
    title: string
  ): Promise<Project> {
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
   * Delete a project
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
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { projectId, userId },
      });
      throw error;
    }
  }
}
