import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/imagen';
import { createServerSupabaseClient, ensureHttpsProtocol } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { v4 as uuid } from 'uuid';
import {
  validateString,
  validateUUID,
  validateAspectRatio,
  validateSeed,
  validateSampleCount,
  validateSafetyFilterLevel,
  validatePersonGeneration,
  validateAll,
} from '@/lib/api/validation';
import {
  unauthorizedResponse,
  rateLimitResponse,
  validationError,
  errorResponse,
  withErrorHandling,
} from '@/lib/api/response';
import { verifyProjectOwnership } from '@/lib/api/project-verification';

/**
 * Generate images from a text prompt using Google Imagen 3.
 *
 * Creates one or more AI-generated images based on a text description. Images are automatically
 * uploaded to storage and added as assets to the specified project.
 *
 * @route POST /api/image/generate
 *
 * @param {string} request.body.prompt - Text description of the image to generate (3-1000 characters)
 * @param {string} request.body.projectId - UUID of the project to add images to
 * @param {string} [request.body.model] - Imagen model to use (defaults to 'imagen-3.0-generate-001')
 * @param {string} [request.body.aspectRatio] - Image aspect ratio ('1:1', '3:4', '4:3', '9:16', '16:9')
 * @param {string} [request.body.negativePrompt] - Text describing what to avoid (max 1000 chars)
 * @param {number} [request.body.sampleCount] - Number of images to generate (1-8, default 1)
 * @param {number} [request.body.seed] - Random seed for reproducible generation (0-2147483647)
 * @param {string} [request.body.safetyFilterLevel] - Safety filter strength ('block_most', 'block_some', 'block_few')
 * @param {string} [request.body.personGeneration] - Person generation setting ('dont_allow', 'allow_adult', 'allow_all')
 * @param {boolean} [request.body.addWatermark] - Whether to add a watermark to images
 * @param {string} [request.body.language] - Language code for prompt (e.g., 'en', 'es', 'fr')
 * @param {string} [request.body.outputMimeType] - Output format ('image/png' or 'image/jpeg')
 *
 * @returns {object} Generation result with created assets
 * @returns {array} returns.assets - Array of created asset objects
 * @returns {string} returns.assets[].id - Asset UUID
 * @returns {string} returns.assets[].type - Asset type ('image')
 * @returns {string} returns.assets[].storage_url - Storage URL
 * @returns {object} returns.assets[].metadata - Asset metadata including prompt, model, etc.
 * @returns {string} returns.message - Success message with count
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the specified project
 * @throws {400} Bad Request - Invalid parameters (prompt length, invalid UUID, etc.)
 * @throws {429} Too Many Requests - Rate limit exceeded (10 requests per minute)
 * @throws {500} Internal Server Error - Image generation or storage error
 *
 * @ratelimit 10 requests per minute (TIER 2 - Resource Creation)
 *
 * @authentication Required - Session cookie (supabase-auth-token)
 *
 * @example
 * POST /api/image/generate
 * {
 *   "prompt": "A photorealistic cat wearing sunglasses on a beach",
 *   "projectId": "123e4567-e89b-12d3-a456-426614174000",
 *   "aspectRatio": "16:9",
 *   "sampleCount": 2,
 *   "safetyFilterLevel": "block_some",
 *   "personGeneration": "dont_allow"
 * }
 *
 * Response:
 * {
 *   "assets": [
 *     {
 *       "id": "asset-uuid-1",
 *       "project_id": "123e4567-e89b-12d3-a456-426614174000",
 *       "type": "image",
 *       "storage_url": "supabase://assets/user-id/project-id/images/imagen_1234_0.png",
 *       "metadata": {
 *         "filename": "imagen_1234_0.png",
 *         "mimeType": "image/png",
 *         "sourceUrl": "https://...",
 *         "provider": "imagen",
 *         "model": "imagen-3.0-generate-001",
 *         "prompt": "A photorealistic cat..."
 *       }
 *     },
 *     {
 *       "id": "asset-uuid-2",
 *       ...
 *     }
 *   ],
 *   "message": "Generated 2 image(s) successfully"
 * }
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const startTime = Date.now();
    serverLogger.info({
      event: 'image.generate.request_started',
    }, 'Image generation request received');

    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn({
        event: 'image.generate.unauthorized',
        error: authError?.message,
      }, 'Unauthorized image generation attempt');
      return unauthorizedResponse();
    }

    serverLogger.debug({
      event: 'image.generate.user_authenticated',
      userId: user.id,
    }, 'User authenticated for image generation');

    // TIER 2 RATE LIMITING: Resource creation - image generation (10/min)
    // Prevents resource exhaustion and controls AI API costs
    const rateLimitResult = await checkRateLimit(`image-gen:${user.id}`, RATE_LIMITS.tier2_resource_creation);

    if (!rateLimitResult.success) {
      serverLogger.warn({
        event: 'image.generate.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      }, 'Image generation rate limit exceeded');
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetAt);
    }

    serverLogger.debug({
      event: 'image.generate.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    }, 'Rate limit check passed');

    const body = await req.json();
    const {
      prompt,
      model,
      aspectRatio,
      negativePrompt,
      sampleCount,
      seed,
      safetyFilterLevel,
      personGeneration,
      addWatermark,
      language,
      outputMimeType,
      projectId,
    } = body;

    // Validate all inputs using centralized validation utilities
    const validation = validateAll([
      validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 }),
      validateUUID(projectId, 'projectId'),
      validateAspectRatio(aspectRatio),
      validateSampleCount(sampleCount, 8), // Max 8 for images
      validateSeed(seed),
      validateString(negativePrompt, 'negativePrompt', { required: false, maxLength: 1000 }),
      validateSafetyFilterLevel(safetyFilterLevel),
      validatePersonGeneration(personGeneration),
    ]);

    if (!validation.valid) {
      const firstError = validation.errors[0];
      serverLogger.warn({
        event: 'image.generate.validation_error',
        userId: user.id,
        field: firstError.field,
        error: firstError.message,
      }, `Validation error: ${firstError.message}`);
      return validationError(firstError.message, firstError.field);
    }

    // Verify user owns the project using centralized verification
    const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id);
    if (!projectVerification.hasAccess) {
      return errorResponse(projectVerification.error!, projectVerification.status!);
    }

    // Generate images with Imagen
    const result = await generateImage({
      prompt,
      model,
      aspectRatio,
      negativePrompt,
      sampleCount: sampleCount || 1,
      seed,
      safetyFilterLevel,
      personGeneration,
      addWatermark,
      language,
      outputMimeType,
    });

    // Upload images to Supabase storage and create asset records
    const assets = [];

    for (let i = 0; i < result.predictions.length; i++) {
      const prediction = result.predictions[i];

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');

      // Determine file extension based on MIME type
      const extension = prediction.mimeType === 'image/png' ? 'png' : 'jpg';
      const fileName = `imagen_${Date.now()}_${i}.${extension}`;
      const storagePath = `${user.id}/${projectId}/images/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, imageBuffer, {
          contentType: prediction.mimeType,
          upsert: false,
        });

      if (uploadError) {
        serverLogger.error({ error: uploadError, userId: user.id, projectId }, 'Image upload error');
        continue;
      }

      // Get public URL and ensure it has the https:// protocol
      const { data: { publicUrl: rawPublicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath);
      const publicUrl = ensureHttpsProtocol(rawPublicUrl);

      // Create thumbnail (use the image itself as thumbnail)
      const thumbnailDataUrl = `data:${prediction.mimeType};base64,${prediction.bytesBase64Encoded}`;

      // Create asset record
      const { data: newAsset, error: assetError } = await supabase
        .from('assets')
        .insert({
          id: uuid(),
          user_id: user.id,
          project_id: projectId,
          type: 'image',
          source: 'genai',
          storage_url: `supabase://assets/${storagePath}`,
          metadata: {
            filename: fileName,
            mimeType: prediction.mimeType,
            sourceUrl: publicUrl,
            thumbnail: thumbnailDataUrl,
            provider: 'imagen',
            model: model || 'imagen-3.0-generate-001',
            prompt,
            negativePrompt,
            aspectRatio,
            seed,
          },
        })
        .select()
        .single();

      if (assetError) {
        serverLogger.error({ error: assetError, userId: user.id, projectId }, 'Asset creation error');
        continue;
      }

      assets.push(newAsset);
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'image.generate.success',
      userId: user.id,
      projectId,
      assetsGenerated: assets.length,
      duration,
    }, `Generated ${assets.length} image(s) successfully in ${duration}ms`);

    return NextResponse.json({
      assets,
      message: `Generated ${assets.length} image(s) successfully`,
    });
});
