import { NextRequest, NextResponse } from 'next/server';
import { safeArrayFirst } from '@/lib/utils/arrayUtils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { serverLogger } from '@/lib/serverLogger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ frameId: string }> }
) {
  try {
    // SECURITY: Verify user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { frameId } = await params;
    const body = await request.json();
    const { prompt, mode = 'global', cropX, cropY, cropSize, feather, referenceImages = [], numVariations = 4 } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Validate numVariations
    const variations = Math.max(1, Math.min(numVariations, 8)); // Limit between 1 and 8

    // Get the frame from database with project ownership check in one query
    // SECURITY FIX: Verify user owns BOTH the frame AND the project it belongs to
    const { data: frame, error: frameError } = await supabase
      .from('scene_frames')
      .select(`
        *,
        project:projects!inner(
          id,
          user_id
        ),
        asset:assets!inner(
          id,
          user_id
        )
      `)
      .eq('id', frameId)
      .single();

    if (frameError || !frame) {
      return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
    }

    // Verify user owns the project
    if (!frame.project || frame.project.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - you do not own this project' }, { status: 403 });
    }

    // Verify user owns the asset
    if (!frame.asset || frame.asset.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - you do not own this asset' }, { status: 403 });
    }

    // Get the frame image URL
    const { data: { publicUrl: frameUrl } } = supabase.storage
      .from('frames')
      .getPublicUrl(frame.storage_path.replace('supabase://frames/', ''));

    // Initialize Gemini (check both AISTUDIO_API_KEY and GEMINI_API_KEY)
    const apiKey = process.env.AISTUDIO_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please set AISTUDIO_API_KEY or GEMINI_API_KEY environment variable.' },
        { status: 503 }
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

    const imageParts = [{
      inlineData: {
        data: frameBase64,
        mimeType: frameResponse.headers.get('content-type') || 'image/jpeg',
      },
    }];

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

    fullPrompt += 'Provide specific, actionable editing instructions that could be used to transform the image.';

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
      const variationPrompt = variations > 1
        ? `${fullPrompt}\n\nVariation ${i + 1}: Provide a unique interpretation of this request.`
        : fullPrompt;

      // Generate content with Gemini
      const result = await model.generateContent([
        { text: variationPrompt },
        ...imageParts,
      ]);

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
        serverLogger.error({ error: editError, userId: user.id, frameId, projectId: frame.project_id }, 'Failed to create edit');
        // Continue with other variations even if one fails
        continue;
      }

      edits.push({
        ...edit,
        description: editDescription,
      });
      nextVersion++;
    }

    return NextResponse.json({
      success: true,
      edits,
      count: edits.length,
      note: 'This is using Gemini 2.5 Flash for image analysis. For actual image generation, Imagen 3 or Gemini 2.5 Flash Image Preview would be used.',
    });
  } catch (error) {
    serverLogger.error({ error }, 'Frame edit error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
