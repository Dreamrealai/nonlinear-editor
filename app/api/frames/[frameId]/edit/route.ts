import { NextRequest } from 'next/server';
import { safeArrayFirst } from '@/lib/utils/arrayUtils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { serverLogger } from '@/lib/serverLogger';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { auditLog, auditSecurityEvent, AuditAction } from '@/lib/auditLog';
import { HttpStatusCode } from '@/lib/errors/errorCodes';
import {
  validationError,
  forbiddenResponse,
  notFoundResponse,
  serviceUnavailableResponse,
  successResponse,
} from '@/lib/api/response';
import { validateUUID, validateString, validateInteger, ValidationError } from '@/lib/validation';

export const POST = withAuth<{ frameId: string }>(
  async (request: NextRequest, { user, supabase }, routeContext) => {
    const startTime = Date.now();
    const params = await routeContext?.params;

    if (!params?.frameId) {
      return validationError('Frame ID is required', 'frameId');
    }

    const { frameId } = params;
    const body = await request.json();
    const {
      prompt,
      mode = 'global',
      cropX,
      cropY,
      cropSize,
      feather,
      referenceImages = [],
      numVariations = 4,
    } = body;

    // Validate inputs using centralized validation utilities
    try {
      validateUUID(frameId, 'frameId');
      validateString(prompt, 'prompt', { minLength: 1, maxLength: 1000 });
      validateInteger(numVariations, 'numVariations', { required: false, min: 1, max: 8 });
    } catch (error) {
      if (error instanceof ValidationError) {
        await auditLog({
          userId: user.id,
          action: AuditAction.FRAME_EDIT_FAILED,
          resourceType: 'frame',
          resourceId: frameId,
          metadata: { error: error.message, field: error.field },
          request,
          statusCode: HttpStatusCode.BAD_REQUEST,
        });
        return validationError(error.message, error.field);
      }
      throw error;
    }

    // Limit variations between 1 and 8 (already validated above)
    const variations = numVariations || 4;

    // Audit log: Frame edit request started
    await auditLog({
      userId: user.id,
      action: AuditAction.FRAME_EDIT_REQUEST,
      resourceType: 'frame',
      resourceId: frameId,
      metadata: {
        mode,
        numVariations: variations,
        hasReferenceImages: referenceImages.length > 0,
      },
      request,
    });

    // Get the frame from database with project ownership check in one query
    // SECURITY FIX: Verify user owns BOTH the frame AND the project it belongs to
    const { data: frame, error: frameError } = await supabase
      .from('scene_frames')
      .select(
        `
        *,
        project:projects!inner(
          id,
          user_id
        ),
        asset:assets!inner(
          id,
          user_id
        )
      `
      )
      .eq('id', frameId)
      .single();

    if (frameError || !frame) {
      await auditLog({
        userId: user.id,
        action: AuditAction.FRAME_EDIT_FAILED,
        resourceType: 'frame',
        resourceId: frameId,
        metadata: { error: 'Frame not found', dbError: frameError?.message },
        request,
        statusCode: HttpStatusCode.NOT_FOUND,
      });
      return notFoundResponse('Frame');
    }

    // Verify user owns the project
    if (!frame.project || frame.project.user_id !== user.id) {
      serverLogger.warn(
        {
          event: 'frame.edit.unauthorized',
          userId: user.id,
          frameId,
          projectId: frame.project_id,
          actualOwnerId: frame.project?.user_id,
        },
        'Unauthorized frame edit attempt - project ownership mismatch'
      );

      await auditSecurityEvent(AuditAction.FRAME_EDIT_UNAUTHORIZED, user.id, request, {
        frameId,
        projectId: frame.project_id,
        reason: 'project_ownership_mismatch',
      });

      return forbiddenResponse('Unauthorized - you do not own this project');
    }

    // Verify user owns the asset
    if (!frame.asset || frame.asset.user_id !== user.id) {
      serverLogger.warn(
        {
          event: 'frame.edit.unauthorized',
          userId: user.id,
          frameId,
          assetId: frame.asset_id,
          actualOwnerId: frame.asset?.user_id,
        },
        'Unauthorized frame edit attempt - asset ownership mismatch'
      );

      await auditSecurityEvent(AuditAction.FRAME_EDIT_UNAUTHORIZED, user.id, request, {
        frameId,
        assetId: frame.asset_id,
        reason: 'asset_ownership_mismatch',
      });

      return forbiddenResponse('Unauthorized - you do not own this asset');
    }

    // Get the frame image URL
    const {
      data: { publicUrl: frameUrl },
    } = supabase.storage
      .from('frames')
      .getPublicUrl(frame.storage_path.replace('supabase://frames/', ''));

    // Initialize Gemini (check both AISTUDIO_API_KEY and GEMINI_API_KEY)
    const apiKey = process.env['AISTUDIO_API_KEY'] || process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      await auditLog({
        userId: user.id,
        action: AuditAction.FRAME_EDIT_FAILED,
        resourceType: 'frame',
        resourceId: frameId,
        metadata: { error: 'Gemini API key not configured' },
        request,
        statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
      });
      return serviceUnavailableResponse(
        'Gemini API key not configured. Please set AISTUDIO_API_KEY or GEMINI_API_KEY environment variable.'
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 2.5 Flash for multimodal understanding
    // Note: For actual image generation, you would use Imagen 3 or Gemini 2.5 Flash Image Preview
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Fetch the frame image
    const frameResponse = await fetch(frameUrl);
    const frameArrayBuffer = await frameResponse.arrayBuffer();
    const frameBase64 = Buffer.from(frameArrayBuffer).toString('base64');

    const imageParts = [
      {
        inlineData: {
          data: frameBase64,
          mimeType: frameResponse.headers.get('content-type') || 'image/jpeg',
        },
      },
    ];

    // Add reference images if provided
    for (const refUrl of referenceImages) {
      const refResponse = await fetch(refUrl);
      const refArrayBuffer = await refResponse.arrayBuffer();
      const refBase64 = Buffer.from(refArrayBuffer).toString('base64');
      imageParts.push({
        inlineData: {
          data: refBase64,
          mimeType: refResponse.headers.get('content-type') || 'image/jpeg',
        },
      });
    }

    // Build the full prompt
    let fullPrompt = `You are an image editing assistant. Analyze the provided image(s) and provide detailed instructions for how to edit the first image based on this request: "${prompt}"\n\n`;

    if (mode === 'crop' && cropX !== undefined && cropY !== undefined && cropSize !== undefined) {
      fullPrompt += `Focus on the region at coordinates (${cropX}, ${cropY}) with size ${cropSize}px. Apply a ${feather || 0}px feather to blend changes.\n\n`;
    }

    if (referenceImages.length > 0) {
      fullPrompt += `Reference image(s) are provided for style or content guidance.\n\n`;
    }

    fullPrompt +=
      'Provide specific, actionable editing instructions that could be used to transform the image.';

    // Get the current version number for this frame
    const { data: existingEdits } = await supabase
      .from('frame_edits')
      .select('version')
      .eq('frame_id', frameId)
      .order('version', { ascending: false })
      .limit(1);

    // Safely get the most recent version number
    const latestEdit = safeArrayFirst(existingEdits || []);
    let nextVersion = (latestEdit?.version || 0) + 1;

    // Generate multiple variations
    const edits = [];
    for (let i = 0; i < variations; i++) {
      // Add variation to prompt to encourage different results
      const variationPrompt =
        variations > 1
          ? `${fullPrompt}\n\nVariation ${i + 1}: Provide a unique interpretation of this request.`
          : fullPrompt;

      // Generate content with Gemini
      const result = await model.generateContent([{ text: variationPrompt }, ...imageParts]);

      const editDescription = result.response.text();

      // For now, save the edit metadata
      // In production with Imagen 3, you would:
      // 1. Call Imagen 3 API with the instructions
      // 2. Get the generated image
      // 3. Upload to storage
      // 4. Save the storage path

      const editId = uuid();
      const editStoragePath = `supabase://frames/${user.id}/${frame.project_id}/${editId}.jpg`;

      // Create the edit record
      const { data: edit, error: editError } = await supabase
        .from('frame_edits')
        .insert({
          id: editId,
          frame_id: frameId,
          project_id: frame.project_id,
          asset_id: frame.asset_id,
          version: nextVersion,
          mode,
          prompt,
          model: 'gemini-2.5-flash',
          crop_x: cropX,
          crop_y: cropY,
          crop_size: cropSize,
          feather,
          output_storage_path: editStoragePath,
          metadata: {
            description: editDescription,
            referenceImages: referenceImages.length,
            variation: i + 1,
            note: 'Using Gemini 2.5 Flash for analysis. Upgrade to Imagen 3 for actual image generation.',
          },
        })
        .select()
        .single();

      if (editError) {
        serverLogger.error(
          { error: editError, userId: user.id, frameId, projectId: frame.project_id },
          'Failed to create edit'
        );
        // Continue with other variations even if one fails
        continue;
      }

      edits.push({
        ...edit,
        description: editDescription,
      });
      nextVersion++;
    }

    const duration = Date.now() - startTime;

    // Audit log: Frame edit completed successfully
    await auditLog({
      userId: user.id,
      action: AuditAction.FRAME_EDIT_COMPLETE,
      resourceType: 'frame',
      resourceId: frameId,
      metadata: {
        projectId: frame.project_id,
        assetId: frame.asset_id,
        numEditsCreated: edits.length,
        mode,
      },
      request,
      statusCode: HttpStatusCode.OK,
      durationMs: duration,
    });

    serverLogger.info(
      {
        event: 'frame.edit.success',
        userId: user.id,
        frameId,
        projectId: frame.project_id,
        numEdits: edits.length,
        duration,
      },
      `Frame edit completed successfully (${duration}ms)`
    );

    return successResponse({
      success: true,
      edits,
      count: edits.length,
      note: 'This is using Gemini 2.5 Flash for image analysis. For actual image generation, Imagen 3 or Gemini 2.5 Flash Image Preview would be used.',
    });
  },
  {
    route: '/api/frames/[frameId]/edit',
    rateLimit: RATE_LIMITS.tier2_resource_creation, // 10 requests per minute - expensive AI operation
  }
);
