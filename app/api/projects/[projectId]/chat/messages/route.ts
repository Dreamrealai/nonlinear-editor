/**
 * POST /api/projects/[projectId]/chat/messages
 * Saves a chat message to the database
 *
 * Security:
 * - Requires authentication via withAuth middleware
 * - RLS enforces project ownership
 */

import { NextRequest } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateUUID, validateEnum, validateAll } from '@/lib/api/validation';
import { validationError, errorResponse, successResponse } from '@/lib/api/response';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

const VALID_ROLES = ['user', 'assistant'] as const;

async function handleChatMessagePost(
  request: NextRequest,
  context: AuthContext & { params?: { projectId: string } }
): Promise<Response> {
  const { user, supabase, params } = context;
  const projectId = params?.projectId;

  // Validate projectId from URL params
  const projectIdValidation = validateAll([validateUUID(projectId, 'projectId')]);

  if (!projectIdValidation.valid) {
    const firstError = projectIdValidation.errors[0];
    if (!firstError) {
      return validationError('Validation failed');
    }

    serverLogger.warn(
      {
        event: 'chat.save.validation_error',
        userId: user.id,
        field: firstError.field,
        error: firstError.message,
      },
      `Validation error: ${firstError.message}`
    );
    return validationError(firstError.message, firstError.field);
  }

  // Parse request body
  const body = await request.json();
  const { role, content, model, attachments } = body;

  // Validate all required inputs using centralized validation utilities
  const validation = validateAll([
    validateEnum(role, 'role', VALID_ROLES, true),
    validateString(content, 'content', { minLength: 1 }),
    validateString(model, 'model', { required: false }),
  ]);

  if (!validation.valid) {
    const firstError = validation.errors[0];
    if (!firstError) {
      return validationError('Validation failed');
    }

    serverLogger.warn(
      {
        event: 'chat.save.validation_error',
        userId: user.id,
        projectId,
        field: firstError.field,
        error: firstError.message,
      },
      `Validation error: ${firstError.message}`
    );
    return validationError(firstError.message, firstError.field);
  }

  // After validation, TypeScript knows these are strings
  const validatedRole = role as string;
  const validatedContent = content as string;

  // Insert message (RLS ensures ownership)
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      project_id: projectId,
      role: validatedRole,
      content: validatedContent,
      model: typeof model === 'string' ? model : null,
      attachments: attachments || null,
    })
    .select()
    .single();

  if (error) {
    serverLogger.error(
      { error, projectId, userId: user.id, event: 'chat.save.error' },
      'Failed to save chat message'
    );
    return errorResponse('Failed to save chat message', 500);
  }

  serverLogger.info(
    { projectId, userId: user.id, role: validatedRole, event: 'chat.save.success' },
    'Chat message saved'
  );

  return successResponse({ message: data }, undefined, 201);
}

// Export with authentication middleware and rate limiting
export const POST = withAuth(handleChatMessagePost, {
  route: '/api/projects/[projectId]/chat/messages',
  rateLimit: RATE_LIMITS.tier4_general, // 60 requests per minute for message operations
});
