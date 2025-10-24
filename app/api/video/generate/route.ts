import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/veo';
import { generateFalVideo } from '@/lib/fal-video';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import {
  validateString,
  validateUUID,
  validateAspectRatio,
  validateDuration,
  validateSeed,
  validateSampleCount,
  validateAll,
} from '@/lib/api/validation';
import {
  errorResponse,
  unauthorizedResponse,
  rateLimitResponse,
  validationError,
  withErrorHandling,
} from '@/lib/api/response';
import { verifyProjectOwnership, verifyAssetOwnership } from '@/lib/api/project-verification';

const MODEL_DEFINITIONS = {
  'veo-3.1-generate-preview': { provider: 'veo', supportsAudio: true },
  'veo-3.1-fast-generate-preview': { provider: 'veo', supportsAudio: true },
  'veo-2.0-generate-001': { provider: 'veo', supportsAudio: false },
  'seedance-1.0-pro': { provider: 'fal', supportsAudio: false },
  'minimax-hailuo-02-pro': { provider: 'fal', supportsAudio: false },
} as const;

type SupportedVideoModel = keyof typeof MODEL_DEFINITIONS;

/**
 * Generate a video from a text prompt using AI models (Google Veo, FAL.ai Seedance, or MiniMax).
 *
 * This endpoint supports both text-to-video and image-to-video generation with multiple AI providers.
 * The provider is automatically selected based on the specified model.
 *
 * @route POST /api/video/generate
 *
 * @param {string} request.body.prompt - Text description of the video to generate (3-1000 characters)
 * @param {string} request.body.projectId - UUID of the project to associate the video with
 * @param {string} request.body.model - AI model to use ('veo-002', 'veo-003', 'seedance-1.0-pro', 'minimax-hailuo-02-pro')
 * @param {string} [request.body.aspectRatio] - Video aspect ratio ('16:9', '9:16', '1:1', '4:3', '3:4')
 * @param {number} [request.body.duration] - Video duration in seconds (varies by model, typically 1-10)
 * @param {string} [request.body.resolution] - Video resolution ('480p', '720p', '1080p')
 * @param {string} [request.body.negativePrompt] - Text describing what to avoid in the video (max 1000 chars)
 * @param {string} [request.body.personGeneration] - Person generation setting ('dont_allow', 'allow_adult', 'allow_all')
 * @param {boolean} [request.body.enhancePrompt] - Whether to enhance the prompt with AI optimization
 * @param {boolean} [request.body.generateAudio] - Whether to generate audio for the video (Veo only)
 * @param {number} [request.body.seed] - Random seed for reproducible generation (0-2147483647)
 * @param {number} [request.body.sampleCount] - Number of video variations to generate (1-4)
 * @param {number} [request.body.compressionQuality] - Video compression quality (0-100, Veo only)
 * @param {string} [request.body.imageAssetId] - UUID of an image asset to use as the first frame (image-to-video)
 *
 * @returns {object} Video generation operation details for status polling
 * @returns {string} returns.operationName - Unique operation identifier for polling status
 * @returns {string} returns.status - Operation status ('processing')
 * @returns {string} returns.message - Human-readable status message
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the specified project or image asset
 * @throws {400} Bad Request - Invalid parameters (prompt length, invalid UUID, etc.)
 * @throws {429} Too Many Requests - Rate limit exceeded (10 requests per minute)
 * @throws {500} Internal Server Error - Video generation service error
 *
 * @ratelimit 10 requests per minute (TIER 2 - Resource Creation)
 *
 * @authentication Required - Session cookie (supabase-auth-token)
 *
 * @example
 * // Text-to-video with Google Veo
 * POST /api/video/generate
 * {
 *   "prompt": "A serene lake at sunset with mountains in the background",
 *   "projectId": "123e4567-e89b-12d3-a456-426614174000",
 *   "model": "veo-002",
 *   "duration": 5,
 *   "aspectRatio": "16:9",
 *   "resolution": "1080p"
 * }
 *
 * Response:
 * {
 *   "operationName": "projects/123/locations/us-central1/operations/456",
 *   "status": "processing",
 *   "message": "Video generation started. Use the operation name to check status."
 * }
 *
 * @example
 * // Image-to-video with FAL.ai Seedance
 * POST /api/video/generate
 * {
 *   "prompt": "The cat starts walking across the room",
 *   "projectId": "123e4567-e89b-12d3-a456-426614174000",
 *   "model": "seedance-1.0-pro",
 *   "imageAssetId": "789e4567-e89b-12d3-a456-426614174000",
 *   "duration": 4,
 *   "aspectRatio": "16:9"
 * }
 *
 * Response:
 * {
 *   "operationName": "fal:seedance-1.0-pro:abc123def456",
 *   "status": "processing",
 *   "message": "Video generation started. Use the operation name to check status."
 * }
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'video.generate.request_started',
    },
    'Video generation request received'
  );

  const supabase =
    (await createServerSupabaseClient()) ??
    ((globalThis as Record<string, unknown>).__TEST_SUPABASE_CLIENT__ as any);

  if (!supabase) {
    throw new Error('Supabase client is not available for video generation');
  }

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    serverLogger.warn(
      {
        event: 'video.generate.unauthorized',
        error: authError?.message,
      },
      'Unauthorized video generation attempt'
    );
    return ensureResponse(
      unauthorizedResponse(),
      () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
  }

  serverLogger.debug(
    {
      event: 'video.generate.user_authenticated',
      userId: user.id,
    },
    'User authenticated for video generation'
  );

  // TIER 2 RATE LIMITING: Resource creation - video generation (10/min)
  // Prevents resource exhaustion and controls AI API costs
  const rateLimitResult = await checkRateLimit(
    `video-gen:${user.id}`,
    RATE_LIMITS.tier2_resource_creation
  );

  if (!rateLimitResult.success) {
    serverLogger.warn(
      {
        event: 'video.generate.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      },
      'Video generation rate limit exceeded'
    );
    return ensureResponse(
      rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetAt),
      () =>
        NextResponse.json(
          {
            error: 'Rate limit exceeded',
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetAt: rateLimitResult.resetAt,
          },
          { status: 429 }
        )
    );
  }

  serverLogger.debug(
    {
      event: 'video.generate.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    },
    'Rate limit check passed'
  );

  const body = await req.json();
  const {
    prompt,
    model,
    aspectRatio,
    duration,
    resolution,
    negativePrompt,
    personGeneration,
    enhancePrompt,
    generateAudio,
    seed,
    sampleCount,
    compressionQuality,
    projectId,
    imageAssetId,
  } = body;

  serverLogger.debug(
    {
      event: 'video.generate.params_received',
      userId: user.id,
      model,
      aspectRatio,
      duration,
      hasPrompt: !!prompt,
      promptLength: prompt?.length,
      hasImageAsset: !!imageAssetId,
      projectId,
    },
    'Video generation parameters received'
  );

  const modelConfig = MODEL_DEFINITIONS[model as SupportedVideoModel];

  if (!modelConfig) {
    serverLogger.warn(
      {
        event: 'video.generate.unsupported_model',
        userId: user.id,
        model,
      },
      'Unsupported video generation model requested'
    );
    return ensureResponse(
      validationError('Unsupported video generation model', 'model'),
      () =>
        NextResponse.json(
          { error: 'Unsupported video generation model', field: 'model' },
          { status: 400 }
        )
    );
  }

  // Validate all inputs using centralized validation utilities
  const validation = validateAll([
    validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 }),
    validateUUID(projectId, 'projectId'),
    validateAspectRatio(aspectRatio),
    validateDuration(duration),
    validateSeed(seed),
    validateSampleCount(sampleCount, 4), // Max 4 for video
    validateString(negativePrompt, 'negativePrompt', { required: false, maxLength: 1000 }),
    imageAssetId ? validateUUID(imageAssetId, 'imageAssetId') : null,
  ]);

  if (!validation.valid) {
    const firstError = validation.errors[0];

    if (!firstError) {
      return ensureResponse(
        validationError('Validation failed'),
        () => NextResponse.json({ error: 'Validation failed' }, { status: 400 })
      );
    }

    serverLogger.warn(
      {
        event: 'video.generate.validation_error',
        userId: user.id,
        field: firstError.field,
        error: firstError.message,
      },
      `Validation error: ${firstError.message}`
    );
    return ensureResponse(
      validationError(firstError.message, firstError.field),
      () =>
        NextResponse.json(
          { error: firstError.message, field: firstError.field },
          { status: 400 }
        )
    );
  }

  // Verify user owns the project using centralized verification
  const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id);
  if (!projectVerification.hasAccess) {
    serverLogger.warn(
      {
        event: 'video.generate.project_not_found',
        userId: user.id,
        projectId,
      },
      projectVerification.error
    );
    return ensureResponse(
      errorResponse(projectVerification.error!, projectVerification.status!),
      () =>
        NextResponse.json(
          { error: projectVerification.error ?? 'Project access denied' },
          { status: projectVerification.status ?? 403 }
        )
    );
  }

  // Fetch image URL if imageAssetId is provided
  let imageUrl: string | undefined;
  if (imageAssetId) {
    const assetVerification = await verifyAssetOwnership(supabase, imageAssetId, user.id);
    if (!assetVerification.hasAccess) {
      return errorResponse(assetVerification.error!, assetVerification.status!);
    }

    const imageAsset = assetVerification.asset!;

    // Parse storage URL and get public URL
    const storageUrl = imageAsset.storage_url!.replace(/^supabase:\/\//, '');
    const [bucket, ...pathParts] = storageUrl.split('/');
    const path = pathParts.join('/');

    if (!bucket) {
      throw new Error('Invalid storage URL: missing bucket');
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);

    imageUrl = publicUrlData.publicUrl;
  }

  // Route to appropriate provider based on model
  const provider = modelConfig.provider;
  const shouldGenerateAudio = modelConfig.supportsAudio ? generateAudio !== false : false;

  serverLogger.info(
    {
      event: 'video.generate.starting',
      userId: user.id,
      projectId,
      model,
      provider,
      aspectRatio,
      duration,
      hasImageUrl: !!imageUrl,
      promptLength: prompt.length,
    },
    `Starting video generation with ${provider}`
  );

  if (provider === 'fal') {
    // Use FAL.ai for Seedance and MiniMax models
    const result = await generateFalVideo({
      prompt,
      model,
      aspectRatio,
      duration,
      resolution,
      ...(imageUrl && { imageUrl }),
      promptOptimizer: enhancePrompt,
    });

    const duration_ms = Date.now() - startTime;
    serverLogger.info(
      {
        event: 'video.generate.fal_started',
        userId: user.id,
        projectId,
        model,
        operationName: `fal:${result.endpoint}:${result.requestId}`,
        requestId: result.requestId,
        endpoint: result.endpoint,
        duration: duration_ms,
      },
      `FAL video generation initiated in ${duration_ms}ms`
    );

    return NextResponse.json({
      operationName: `fal:${result.endpoint}:${result.requestId}`,
      status: 'processing',
      message: 'Video generation started. Use the operation name to check status.',
    });
  } else {
    // Use Google Veo for Google models
    const result = await generateVideo({
      prompt,
      model,
      aspectRatio,
      duration,
      resolution,
      negativePrompt,
      personGeneration,
      enhancePrompt,
      generateAudio: shouldGenerateAudio,
      seed,
      sampleCount,
      compressionQuality,
      ...(imageUrl && { imageUrl }),
    });

    const duration_ms = Date.now() - startTime;
    serverLogger.info(
      {
        event: 'video.generate.veo_started',
        userId: user.id,
        projectId,
        model,
        operationName: result.name,
        duration: duration_ms,
      },
      `Veo video generation initiated in ${duration_ms}ms`
    );

    return NextResponse.json({
      operationName: result.name,
      status: 'processing',
      message: 'Video generation started. Use the operation name to check status.',
    });
  }
});
