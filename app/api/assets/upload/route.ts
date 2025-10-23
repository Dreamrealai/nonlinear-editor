import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = (formData.get('projectId') as string) || '';
    const type = (formData.get('type') as string) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // SECURITY: Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // SECURITY: File size validation (100MB max)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large',
        details: 'Maximum file size is 100MB'
      }, { status: 400 });
    }

    // SECURITY: MIME type validation
    const ALLOWED_MIME_TYPES = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
      video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
    };

    const allowedTypes = ALLOWED_MIME_TYPES[type as keyof typeof ALLOWED_MIME_TYPES] || ALLOWED_MIME_TYPES.image;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type',
        details: `Allowed types for ${type}: ${allowedTypes.join(', ')}`
      }, { status: 400 });
    }

    // Generate unique filename with safe extension fallback
    const originalName = (file.name || '').trim();
    const extFromName = originalName.includes('.') ? originalName.split('.').pop() : '';
    const extFromMime = file.type?.split('/')[1];
    const resolvedExt = (extFromName || extFromMime || 'bin').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${crypto.randomUUID()}.${resolvedExt}`;
    const folder = type === 'audio' ? 'audio' : type === 'video' ? 'video' : 'image';
    const filePath = `${user.id}/${projectId}/${folder}/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload file:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    // Get image dimensions if it's an image
    // Note: In a production app, you might want to use an image processing library
    // to extract actual dimensions. For now, we'll leave them null.
    const width: number | null = null;
    const height: number | null = null;

    // Create asset record in database (schema alignment)
    const assetId = crypto.randomUUID();
    const storageUrl = `supabase://assets/${filePath}`;

    const { error: dbError } = await supabase
      .from('assets')
      .insert({
        id: assetId,
        project_id: projectId,
        user_id: user.id,
        storage_url: storageUrl,
        type,
        mime_type: file.type,
        width,
        height,
        source: 'upload',
        metadata: {
          filename: originalName || fileName,
          mimeType: file.type,
          sourceUrl: publicUrl,
          size: file.size,
        },
      });

    if (dbError) {
      console.error('Failed to create asset record:', dbError);
      // Try to delete the uploaded file
      await supabase.storage.from('assets').remove([filePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      assetId,
      storageUrl,
      publicUrl,
      success: true,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
