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
} from '@/lib/api/response';
import { verifyProjectOwnership, verifyAssetOwnership } from '@/lib/api/project-verification';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'video.generate.request_started',
    }, 'Video generation request received');

    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn({
        event: 'video.generate.unauthorized',
        error: authError?.message,
      }, 'Unauthorized video generation attempt');
      return unauthorizedResponse();
    }

    serverLogger.debug({
      event: 'video.generate.user_authenticated',
      userId: user.id,
    }, 'User authenticated for video generation');

    // Rate limiting (expensive operation - 5 requests per minute per user)
    const rateLimitResult = await checkRateLimit(`video-gen:${user.id}`, RATE_LIMITS.expensive);

    if (!rateLimitResult.success) {
      serverLogger.warn({
        event: 'video.generate.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      }, 'Video generation rate limit exceeded');
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetAt);
    }

    serverLogger.debug({
      event: 'video.generate.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    }, 'Rate limit check passed');

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

    serverLogger.debug({
      event: 'video.generate.params_received',
      userId: user.id,
      model,
      aspectRatio,
      duration,
      hasPrompt: !!prompt,
      promptLength: prompt?.length,
      hasImageAsset: !!imageAssetId,
      projectId,
    }, 'Video generation parameters received');

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
      serverLogger.warn({
        event: 'video.generate.validation_error',
        userId: user.id,
        field: firstError.field,
        error: firstError.message,
      }, `Validation error: ${firstError.message}`);
      return validationError(firstError.message, firstError.field);
    }

    // Verify user owns the project using centralized verification
    const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id);
    if (!projectVerification.hasAccess) {
      serverLogger.warn({
        event: 'video.generate.project_not_found',
        userId: user.id,
        projectId,
      }, projectVerification.error);
      return errorResponse(projectVerification.error!, projectVerification.status!);
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

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      imageUrl = publicUrlData.publicUrl;
    }

    // Route to appropriate provider based on model
    const isFalModel = model === 'seedance-1.0-pro' || model === 'minimax-hailuo-02-pro';
    const provider = isFalModel ? 'fal' : 'veo';

    serverLogger.info({
      event: 'video.generate.starting',
      userId: user.id,
      projectId,
      model,
      provider,
      aspectRatio,
      duration,
      hasImageUrl: !!imageUrl,
      promptLength: prompt.length,
    }, `Starting video generation with ${provider}`);

    if (isFalModel) {
      // Use FAL.ai for Seedance and MiniMax models
      const result = await generateFalVideo({
        prompt,
        model,
        aspectRatio,
        duration,
        resolution,
        imageUrl,
        promptOptimizer: enhancePrompt,
      });

      const duration_ms = Date.now() - startTime;
      serverLogger.info({
        event: 'video.generate.fal_started',
        userId: user.id,
        projectId,
        model,
        operationName: `fal:${result.endpoint}:${result.requestId}`,
        requestId: result.requestId,
        endpoint: result.endpoint,
        duration: duration_ms,
      }, `FAL video generation initiated in ${duration_ms}ms`);

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
        generateAudio,
        seed,
        sampleCount,
        compressionQuality,
        imageUrl,
      });

      const duration_ms = Date.now() - startTime;
      serverLogger.info({
        event: 'video.generate.veo_started',
        userId: user.id,
        projectId,
        model,
        operationName: result.name,
        duration: duration_ms,
      }, `Veo video generation initiated in ${duration_ms}ms`);

      return NextResponse.json({
        operationName: result.name,
        status: 'processing',
        message: 'Video generation started. Use the operation name to check status.',
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'video.generate.error',
      error,
      duration,
    }, 'Video generation error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
}
