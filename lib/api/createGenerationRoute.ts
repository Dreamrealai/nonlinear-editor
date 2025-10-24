import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { ValidationError } from '@/lib/validation';
import {
  unauthorizedResponse,
  rateLimitResponse,
  withErrorHandling,
} from '@/lib/api/response';
import { verifyProjectOwnership } from '@/lib/api/project-verification';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Configuration for a generation route
 */
export interface GenerationRouteConfig<TRequest, TResponse> {
  /**
   * Route identifier for logging (e.g., 'image.generate', 'audio.tts')
   */
  routeId: string;

  /**
   * Rate limit key prefix (e.g., 'image-gen', 'audio-tts')
   */
  rateLimitPrefix: string;

  /**
   * Validation function for the request body
   * @param body - The parsed request body
   * @throws {ValidationError} if validation fails
   */
  validateRequest: (body: Record<string, unknown>) => void;

  /**
   * Execute the generation operation
   * @param options - Generation context including validated body, user, supabase client
   * @returns The generation response
   */
  execute: (options: {
    body: TRequest;
    userId: string;
    projectId: string;
    supabase: SupabaseClient;
  }) => Promise<TResponse>;

  /**
   * Format the success response
   * @param result - The execution result
   * @returns NextResponse to return to client
   */
  formatResponse: (result: TResponse) => NextResponse;
}

/**
 * Factory function to create standardized generation API routes.
 *
 * This factory eliminates code duplication across generation routes by extracting
 * the common pattern:
 * 1. Authentication check
 * 2. Rate limiting (TIER 2)
 * 3. Request validation
 * 4. Project ownership verification
 * 5. Execute generation
 * 6. Return standardized response
 *
 * @template TRequest - The request body type
 * @template TResponse - The response type from execution
 * @param config - Route configuration
 * @returns A Next.js route handler (POST function)
 *
 * @example
 * ```typescript
 * export const POST = createGenerationRoute({
 *   routeId: 'image.generate',
 *   rateLimitPrefix: 'image-gen',
 *   getValidationRules: (body) => [
 *     validateString(body.prompt, 'prompt', { minLength: 3, maxLength: 1000 }),
 *     validateUUID(body.projectId, 'projectId'),
 *   ],
 *   execute: async ({ body, userId, projectId, supabase }) => {
 *     // Call AI service
 *     return await generateImage(body);
 *   },
 *   formatResponse: (result) => NextResponse.json({ assets: result.assets }),
 * });
 * ```
 */
export function createGenerationRoute<TRequest extends Record<string, unknown>, TResponse>(
  config: GenerationRouteConfig<TRequest, TResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return withErrorHandling(async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();

    serverLogger.info(
      {
        event: `${config.routeId}.request_started`,
      },
      `${config.routeId} request received`
    );

    // Step 1: Create Supabase client
    const supabase = await createServerSupabaseClient();

    // Step 2: Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn(
        {
          event: `${config.routeId}.unauthorized`,
          error: authError?.message,
        },
        `Unauthorized ${config.routeId} attempt`
      );
      return unauthorizedResponse();
    }

    serverLogger.debug(
      {
        event: `${config.routeId}.user_authenticated`,
        userId: user.id,
      },
      `User authenticated for ${config.routeId}`
    );

    // Step 3: Rate limiting (TIER 2 - Resource Creation)
    const rateLimitResult = await checkRateLimit(
      `${config.rateLimitPrefix}:${user.id}`,
      RATE_LIMITS.tier2_resource_creation
    );

    if (!rateLimitResult.success) {
      serverLogger.warn(
        {
          event: `${config.routeId}.rate_limited`,
          userId: user.id,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
        `${config.routeId} rate limit exceeded`
      );
      return rateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.resetAt
      );
    }

    serverLogger.debug(
      {
        event: `${config.routeId}.rate_limit_ok`,
        userId: user.id,
        remaining: rateLimitResult.remaining,
      },
      'Rate limit check passed'
    );

    // Step 4: Parse and validate request body
    const body = (await req.json()) as Record<string, unknown>;
    const projectId = body.projectId as string;

    try {
      config.validateRequest(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        serverLogger.warn(
          {
            event: `${config.routeId}.validation_error`,
            userId: user.id,
            field: error.field,
            error: error.message,
          },
          `Validation error: ${error.message}`
        );
        return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
      }
      throw error;
    }

    // Step 5: Verify project ownership
    const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id);
    if (!projectVerification.hasAccess) {
      serverLogger.warn(
        {
          event: `${config.routeId}.project_access_denied`,
          userId: user.id,
          projectId,
          error: projectVerification.error,
        },
        projectVerification.error ?? 'Project access denied'
      );
      return NextResponse.json(
        { error: projectVerification.error ?? 'Project access denied' },
        { status: projectVerification.status ?? 403 }
      );
    }

    // Step 6: Execute generation
    serverLogger.info(
      {
        event: `${config.routeId}.executing`,
        userId: user.id,
        projectId,
      },
      `Executing ${config.routeId}`
    );

    const result = await config.execute({
      body: body as TRequest,
      userId: user.id,
      projectId,
      supabase,
    });

    // Step 7: Log success and return response
    const duration = Date.now() - startTime;
    serverLogger.info(
      {
        event: `${config.routeId}.success`,
        userId: user.id,
        projectId,
        duration,
      },
      `${config.routeId} completed successfully in ${duration}ms`
    );

    return config.formatResponse(result);
  });
}
