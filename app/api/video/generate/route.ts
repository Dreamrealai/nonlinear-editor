import { generateVideo } from '@/lib/veo';
import { generateFalVideo } from '@/lib/fal-video';
import { RATE_LIMITS } from '@/lib/rateLimit';
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
  validationError,
  successResponse,
} from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { HttpStatusCode } from '@/lib/errors/errorCodes';
import { verifyProjectOwnership, verifyAssetOwnership } from '@/lib/api/project-verification';

const MODEL_DEFINITIONS = {
  'veo-3.1-generate-preview': { provider: 'veo', supportsAudio: true },
  'veo-3.1-fast-generate-preview': { provider: 'veo', supportsAudio: true },
  'veo-2.0-generate-001': { provider: 'veo', supportsAudio: false },
  'seedance-1.0-pro': { provider: 'fal', supportsAudio: false },
  'minimax-hailuo-02-pro': { provider: 'fal', supportsAudio: false },
} as const;

type SupportedVideoModel = keyof typeof MODEL_DEFINITIONS;
const DEFAULT_VIDEO_MODEL: SupportedVideoModel = 'veo-3.1-generate-preview';

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
const handleVideoGenerate: AuthenticatedHandler = async (req, { user, supabase }) => {
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'video.generate.request_started',
    },
    'Video generation request received'
  );

  serverLogger.debug(
    {
      event: 'video.generate.user_authenticated',
      userId: user.id,
    },
    'User authenticated for video generation'
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (error) {
    serverLogger.warn(
      {
        event: 'video.generate.invalid_json',
        error: error instanceof Error ? error.message : error,
      },
      'Invalid JSON body for video generation request'
    );
    return validationError('Invalid JSON body');
  }
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

  const requestedModel =
    typeof model === 'string' && model.trim().length > 0 ? model.trim() : undefined;

  if (requestedModel && !Object.prototype.hasOwnProperty.call(MODEL_DEFINITIONS, requestedModel)) {
    serverLogger.warn(
      {
        event: 'video.generate.unsupported_model',
        userId: user.id,
        model: requestedModel,
      },
      'Unsupported video generation model requested'
    );

    return validationError(
      `The video model '${requestedModel}' is not supported. Please use one of: ${Object.keys(MODEL_DEFINITIONS).join(', ')}`,
      'model'
    );
  }

  const selectedModel = (requestedModel ?? DEFAULT_VIDEO_MODEL) as SupportedVideoModel;
  const modelConfig = MODEL_DEFINITIONS[selectedModel];

  serverLogger.debug(
    {
      event: 'video.generate.params_received',
      userId: user.id,
      model: selectedModel,
      aspectRatio,
      duration,
      hasPrompt: !!prompt,
      promptLength: typeof prompt === 'string' ? prompt.length : 0,
      hasImageAsset: !!imageAssetId,
      projectId,
    },
    'Video generation parameters received'
  );

  if (!modelConfig) {
    serverLogger.error(
      {
        event: 'video.generate.model_lookup_failed',
        userId: user.id,
        model: selectedModel,
      },
      'Model definition missing after validation checks'
    );
    return errorResponse(
      'The requested model configuration is unavailable.',
      HttpStatusCode.INTERNAL_SERVER_ERROR
    );
  }

  // Validate all inputs using centralized validation utilities
  const validationResult = validateAll([
    validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 }),
    validateUUID(projectId, 'projectId'),
    validateAspectRatio(aspectRatio),
    validateDuration(duration),
    validateSeed(seed),
    validateSampleCount(sampleCount, 4), // Max 4 for video
    validateString(negativePrompt, 'negativePrompt', { required: false, maxLength: 1000 }),
    imageAssetId ? validateUUID(imageAssetId, 'imageAssetId') : null,
  ]);

  const validation = validationResult ?? { valid: true, errors: [] };

  if (!validation.valid) {
    const firstError = validation.errors[0];

    if (!firstError) {
      return validationError('Validation failed');
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
    return validationError(firstError.message, firstError.field);
  }

  // Type assertions after validation succeeds
  const validatedPrompt = prompt as string;
  const validatedProjectId = projectId as string;
  const validatedAspectRatio = aspectRatio as '16:9' | '9:16' | '1:1' | undefined;
  const validatedDuration = duration as number | undefined;
  const validatedResolution = resolution as '720p' | '1080p' | undefined;
  const validatedNegativePrompt = negativePrompt as string | undefined;
  const validatedPersonGeneration = personGeneration as 'dont_allow' | 'allow_adult' | undefined;
  const validatedEnhancePrompt = enhancePrompt as boolean | undefined;
  const validatedSeed = seed as number | undefined;
  const validatedSampleCount = sampleCount as number | undefined;
  const validatedCompressionQuality = compressionQuality as 'optimized' | 'lossless' | undefined;
  const validatedImageAssetId = imageAssetId as string | undefined;

  // Verify user owns the project using centralized verification
  const projectVerification = await verifyProjectOwnership(supabase, validatedProjectId, user.id);
  if (process.env.NODE_ENV === 'test') {
    serverLogger.debug({ projectVerification }, 'verifyProjectOwnership called');
  }
  if (!projectVerification.hasAccess) {
    serverLogger.warn(
      {
        event: 'video.generate.project_not_found',
        userId: user.id,
        projectId,
      },
      projectVerification.error
    );
    if (process.env.NODE_ENV === 'test') {
      serverLogger.debug({ projectVerification }, 'Project verification fallback');
    }
    const parsedStatus = Number(projectVerification.status);
    const projectErrorText =
      typeof projectVerification.error === 'string' ? projectVerification.error.toLowerCase() : '';
    const status = Number.isFinite(parsedStatus)
      ? parsedStatus
      : projectErrorText.includes('not')
        ? HttpStatusCode.NOT_FOUND
        : HttpStatusCode.FORBIDDEN;
    return errorResponse(projectVerification.error ?? 'Project access denied', status);
  }

  // Fetch image URL if imageAssetId is provided
  let imageUrl: string | undefined;
  if (validatedImageAssetId) {
    const assetVerification = await verifyAssetOwnership(supabase, validatedImageAssetId, user.id);
    if (!assetVerification.hasAccess) {
      if (process.env.NODE_ENV === 'test') {
        serverLogger.debug({ assetVerification }, 'Asset verification fallback');
      }
      const parsedAssetStatus = Number(assetVerification.status);
      const assetErrorText =
        typeof assetVerification.error === 'string' ? assetVerification.error.toLowerCase() : '';
      const status = Number.isFinite(parsedAssetStatus)
        ? parsedAssetStatus
        : assetErrorText.includes('not')
          ? HttpStatusCode.NOT_FOUND
          : HttpStatusCode.FORBIDDEN;
      return errorResponse(assetVerification.error ?? 'Asset access denied', status);
    }

    const imageAsset = assetVerification.asset!;

    // Parse storage URL and get public URL
    const storageUrl = imageAsset.storage_url!.replace(/^supabase:\/\//, '');
    const [bucket, ...pathParts] = storageUrl.split('/');
    const path = pathParts.join('/');

    if (!bucket) {
      throw new Error(
        'The image asset has an invalid storage configuration. Please try uploading the image again or contact support.'
      );
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
      model: selectedModel,
      provider,
      aspectRatio,
      duration,
      hasImageUrl: !!imageUrl,
      promptLength: typeof prompt === 'string' ? prompt.length : 0,
    },
    `Starting video generation with ${provider}`
  );

  if (provider === 'fal') {
    // Use FAL.ai for Seedance and MiniMax models
    try {
      const result = await generateFalVideo({
        prompt: validatedPrompt,
        model: selectedModel,
        aspectRatio: validatedAspectRatio,
        duration: validatedDuration,
        resolution: validatedResolution,
        ...(imageUrl && { imageUrl }),
        promptOptimizer: validatedEnhancePrompt,
      });

      const duration_ms = Date.now() - startTime;
      serverLogger.info(
        {
          event: 'video.generate.fal_started',
          userId: user.id,
          projectId,
          model: selectedModel,
          operationName: `fal:${result.endpoint}:${result.requestId}`,
          requestId: result.requestId,
          endpoint: result.endpoint,
          duration: duration_ms,
        },
        `FAL video generation initiated in ${duration_ms}ms`
      );

      return successResponse({
        operationName: `fal:${result.endpoint}:${result.requestId}`,
        status: 'processing',
        message: 'Video generation started. Use the operation name to check status.',
      });
    } catch (error) {
      serverLogger.error(
        {
          event: 'video.generate.fal_error',
          userId: user.id,
          projectId,
          model: selectedModel,
          error,
        },
        'FAL video generation failed'
      );
      const message = error instanceof Error ? error.message : 'Failed to generate video';
      return errorResponse(message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  } else {
    // Use Google Veo for Google models
    try {
      const result = await generateVideo({
        prompt: validatedPrompt,
        model: selectedModel,
        aspectRatio: validatedAspectRatio,
        duration: validatedDuration,
        resolution: validatedResolution as '720p' | '1080p' | undefined,
        negativePrompt: validatedNegativePrompt,
        personGeneration: validatedPersonGeneration,
        enhancePrompt: validatedEnhancePrompt,
        generateAudio: shouldGenerateAudio,
        seed: validatedSeed,
        sampleCount: validatedSampleCount,
        compressionQuality: validatedCompressionQuality,
        ...(imageUrl && { imageUrl }),
      });

      const duration_ms = Date.now() - startTime;
      serverLogger.info(
        {
          event: 'video.generate.veo_started',
          userId: user.id,
          projectId,
          model: selectedModel,
          operationName: result.name,
          duration: duration_ms,
        },
        `Veo video generation initiated in ${duration_ms}ms`
      );

      return successResponse({
        operationName: result.name,
        status: 'processing',
        message: 'Video generation started. Use the operation name to check status.',
      });
    } catch (error) {
      serverLogger.error(
        {
          event: 'video.generate.veo_error',
          userId: user.id,
          projectId,
          model: selectedModel,
          error,
        },
        'Veo video generation failed'
      );
      const message = error instanceof Error ? error.message : 'Failed to generate video';
      return errorResponse(message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  }
};

export const POST = withAuth(handleVideoGenerate, {
  route: '/api/video/generate',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
