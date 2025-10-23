import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';

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

    // Get the frame from database
    const { data: frame, error: frameError } = await supabase
      .from('scene_frames')
      .select('*')
      .eq('id', frameId)
      .single();

    if (frameError || !frame) {
      return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
    }

    // Verify user owns this frame's project
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', frame.project_id)
      .single();

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the frame image URL
    const { data: { publicUrl: frameUrl } } = supabase.storage
      .from('frames')
      .getPublicUrl(frame.storage_path.replace('supabase://frames/', ''));

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
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

    // Generate content with Gemini
    const result = await model.generateContent([
      { text: fullPrompt },
      ...imageParts,
    ]);

    const editDescription = result.response.text();

    // Get the current version number for this frame
    const { data: existingEdits } = await supabase
      .from('frame_edits')
      .select('version')
      .eq('frame_id', frameId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existingEdits?.[0]?.version || 0) + 1;

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
          note: 'Using Gemini 2.5 Flash for analysis. Upgrade to Imagen 3 for actual image generation.',
        },
      })
      .select()
      .single();

    if (editError) {
      console.error('Failed to create edit:', editError);
      return NextResponse.json({ error: 'Failed to save edit' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      edit: {
        ...edit,
        description: editDescription,
      },
      note: 'This is using Gemini 2.5 Flash for image analysis. For actual image generation, Imagen 3 or Gemini 2.5 Flash Image Preview would be used.',
    });
  } catch (error) {
    console.error('Frame edit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
