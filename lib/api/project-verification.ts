/**
 * Project Verification Utilities
 *
 * Centralized project ownership and access verification utilities.
 * Eliminates duplicate project verification logic across API routes.
 *
 * @module lib/api/project-verification
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { validateUUID } from './validation';
import { serverLogger } from '@/lib/serverLogger';

/**
 * Project verification result
 */
export interface ProjectVerificationResult {
  /** Whether the project exists and user has access */
  hasAccess: boolean;
  /** Error message if verification failed */
  error?: string;
  /** HTTP status code if verification failed */
  status?: number;
  /** Project data if found */
  project?: {
    id: string;
    user_id: string;
    title?: string;
    [key: string]: unknown;
  };
}

/**
 * Verifies that a project exists and belongs to the specified user
 *
 * @param supabase - Supabase client
 * @param projectId - Project ID to verify
 * @param userId - User ID to check ownership against
 * @param selectFields - Fields to select from project (default: 'id, user_id')
 * @returns ProjectVerificationResult with access status and error details
 *
 * @example
 * const verification = await verifyProjectOwnership(supabase, projectId, user.id);
 * if (!verification.hasAccess) {
 *   return errorResponse(verification.error!, verification.status!);
 * }
 */
export async function verifyProjectOwnership(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  selectFields: string = 'id, user_id'
): Promise<ProjectVerificationResult> {
  // Validate project ID format
  const validationError = validateUUID(projectId, 'projectId');
  if (validationError) {
    return {
      hasAccess: false,
      error: validationError.message,
      status: 400,
    };
  }

  try {
    // Query project with ownership check
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(selectFields)
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project || typeof project === 'string') {
      serverLogger.warn(
        {
          event: 'project.verification.failed',
          projectId,
          userId,
          error: projectError?.message,
        },
        'Project verification failed - not found or access denied'
      );

      return {
        hasAccess: false,
        error: 'Project not found or access denied',
        status: 403,
      };
    }

    serverLogger.debug(
      {
        event: 'project.verification.success',
        projectId,
        userId,
      },
      'Project ownership verified'
    );

    return {
      hasAccess: true,
      project,
    };
  } catch (error) {
    serverLogger.error(
      {
        event: 'project.verification.error',
        projectId,
        userId,
        error,
      },
      'Error verifying project ownership'
    );

    return {
      hasAccess: false,
      error: 'Failed to verify project ownership',
      status: 500,
    };
  }
}

/**
 * Verifies that a project exists (without checking ownership)
 * Useful for admin operations or public access scenarios
 *
 * @param supabase - Supabase client
 * @param projectId - Project ID to verify
 * @param selectFields - Fields to select from project
 * @returns ProjectVerificationResult with project data or error
 *
 * @example
 * const verification = await verifyProjectExists(supabase, projectId);
 * if (!verification.hasAccess) {
 *   return notFoundResponse('Project');
 * }
 */
export async function verifyProjectExists(
  supabase: SupabaseClient,
  projectId: string,
  selectFields: string = 'id, user_id'
): Promise<ProjectVerificationResult> {
  // Validate project ID format
  const validationError = validateUUID(projectId, 'projectId');
  if (validationError) {
    return {
      hasAccess: false,
      error: validationError.message,
      status: 400,
    };
  }

  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(selectFields)
      .eq('id', projectId)
      .maybeSingle();

    if (projectError || !project || typeof project === 'string') {
      serverLogger.warn(
        {
          event: 'project.exists.failed',
          projectId,
          error: projectError?.message,
        },
        'Project not found'
      );

      return {
        hasAccess: false,
        error: 'Project not found',
        status: 404,
      };
    }

    return {
      hasAccess: true,
      project,
    };
  } catch (error) {
    serverLogger.error(
      {
        event: 'project.exists.error',
        projectId,
        error,
      },
      'Error checking project existence'
    );

    return {
      hasAccess: false,
      error: 'Failed to verify project',
      status: 500,
    };
  }
}

/**
 * Asset verification result
 */
export interface AssetVerificationResult {
  /** Whether the asset exists and user has access */
  hasAccess: boolean;
  /** Error message if verification failed */
  error?: string;
  /** HTTP status code if verification failed */
  status?: number;
  /** Asset data if found */
  asset?: {
    id: string;
    user_id: string;
    storage_url?: string;
    [key: string]: unknown;
  };
}

/**
 * Verifies that an asset exists and belongs to the specified user
 *
 * @param supabase - Supabase client
 * @param assetId - Asset ID to verify
 * @param userId - User ID to check ownership against
 * @param selectFields - Fields to select from asset
 * @returns AssetVerificationResult with access status and error details
 *
 * @example
 * const verification = await verifyAssetOwnership(supabase, assetId, user.id);
 * if (!verification.hasAccess) {
 *   return errorResponse(verification.error!, verification.status!);
 * }
 */
export async function verifyAssetOwnership(
  supabase: SupabaseClient,
  assetId: string,
  userId: string,
  selectFields: string = 'id, user_id, storage_url'
): Promise<AssetVerificationResult> {
  // Validate asset ID format
  const validationError = validateUUID(assetId, 'assetId');
  if (validationError) {
    return {
      hasAccess: false,
      error: validationError.message,
      status: 400,
    };
  }

  try {
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(selectFields)
      .eq('id', assetId)
      .eq('user_id', userId)
      .single();

    if (assetError || !asset || typeof asset === 'string') {
      serverLogger.warn(
        {
          event: 'asset.verification.failed',
          assetId,
          userId,
          error: assetError?.message,
        },
        'Asset verification failed - not found or access denied'
      );

      return {
        hasAccess: false,
        error: 'Asset not found or access denied',
        status: 403,
      };
    }

    serverLogger.debug(
      {
        event: 'asset.verification.success',
        assetId,
        userId,
      },
      'Asset ownership verified'
    );

    return {
      hasAccess: true,
      asset,
    };
  } catch (error) {
    serverLogger.error(
      {
        event: 'asset.verification.error',
        assetId,
        userId,
        error,
      },
      'Error verifying asset ownership'
    );

    return {
      hasAccess: false,
      error: 'Failed to verify asset ownership',
      status: 500,
    };
  }
}

/**
 * Batch project verification - checks multiple projects at once
 *
 * @param supabase - Supabase client
 * @param projectIds - Array of project IDs to verify
 * @param userId - User ID to check ownership against
 * @returns Map of projectId -> verification result
 *
 * @example
 * const results = await verifyMultipleProjects(supabase, [id1, id2], user.id);
 * const allValid = Array.from(results.values()).every(r => r.hasAccess);
 */
export async function verifyMultipleProjects(
  supabase: SupabaseClient,
  projectIds: string[],
  userId: string
): Promise<Map<string, ProjectVerificationResult>> {
  const results = new Map<string, ProjectVerificationResult>();

  // Validate all project IDs first
  for (const projectId of projectIds) {
    const validationError = validateUUID(projectId, 'projectId');
    if (validationError) {
      results.set(projectId, {
        hasAccess: false,
        error: validationError.message,
        status: 400,
      });
      return results; // Return early on validation error
    }
  }

  try {
    // Query all projects in a single request
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .in('id', projectIds)
      .eq('user_id', userId);

    if (projectError) {
      serverLogger.error(
        {
          event: 'projects.batch_verification.error',
          projectIds,
          userId,
          error: projectError.message,
        },
        'Error in batch project verification'
      );

      // Mark all as failed
      for (const projectId of projectIds) {
        results.set(projectId, {
          hasAccess: false,
          error: 'Failed to verify projects',
          status: 500,
        });
      }
      return results;
    }

    // Create a Set of found project IDs for quick lookup
    const foundProjectIds = new Set((projects || []).map((p) => p.id));

    // Build results map
    for (const projectId of projectIds) {
      if (foundProjectIds.has(projectId)) {
        results.set(projectId, {
          hasAccess: true,
          project: projects!.find((p) => p.id === projectId),
        });
      } else {
        results.set(projectId, {
          hasAccess: false,
          error: 'Project not found or access denied',
          status: 403,
        });
      }
    }

    return results;
  } catch (error) {
    serverLogger.error(
      {
        event: 'projects.batch_verification.exception',
        projectIds,
        userId,
        error,
      },
      'Exception in batch project verification'
    );

    // Mark all as failed
    for (const projectId of projectIds) {
      results.set(projectId, {
        hasAccess: false,
        error: 'Failed to verify projects',
        status: 500,
      });
    }

    return results;
  }
}
