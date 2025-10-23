import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';
import { serverLogger } from '@/lib/serverLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'assets.upload.request_started',
    }, 'Asset upload request received');

    // SECURITY: Verify user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      serverLogger.warn({
        event: 'assets.upload.unauthorized',
      }, 'Unauthorized asset upload attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    serverLogger.debug({
      event: 'assets.upload.user_authenticated',
      userId: user.id,
    }, 'User authenticated for asset upload');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = (formData.get('projectId') as string) || '';
    const type = (formData.get('type') as string) || 'image';

    serverLogger.debug({
      event: 'assets.upload.file_received',
      userId: user.id,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      assetType: type,
      projectId,
    }, 'Upload file received');

    if (!file) {
      serverLogger.warn({
        event: 'assets.upload.no_file',
        userId: user.id,
      }, 'No file provided in upload request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      serverLogger.warn({
        event: 'assets.upload.no_project',
        userId: user.id,
      }, 'No project ID provided');
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
      serverLogger.warn({
        event: 'assets.upload.project_not_found',
        userId: user.id,
        projectId,
        error: projectError?.message,
      }, 'Project not found or unauthorized');
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // SECURITY: File size validation (100MB max)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      serverLogger.warn({
        event: 'assets.upload.file_too_large',
        userId: user.id,
        projectId,
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
        fileName: file.name,
      }, `File size ${file.size} exceeds maximum ${MAX_FILE_SIZE}`);
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
      serverLogger.warn({
        event: 'assets.upload.invalid_mime_type',
        userId: user.id,
        projectId,
        fileType: file.type,
        assetType: type,
        allowedTypes,
      }, `Invalid MIME type ${file.type} for asset type ${type}`);
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

    serverLogger.debug({
      event: 'assets.upload.uploading_to_storage',
      userId: user.id,
      projectId,
      filePath,
      fileSize: file.size,
      folder,
    }, 'Uploading file to storage');

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
      serverLogger.error({
        event: 'assets.upload.storage_error',
        userId: user.id,
        projectId,
        filePath,
        error: uploadError.message,
        code: uploadError.name,
      }, 'Failed to upload file to storage');
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    serverLogger.debug({
      event: 'assets.upload.storage_success',
      userId: user.id,
      projectId,
      filePath,
      fileSize: file.size,
    }, 'File uploaded to storage successfully');

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
      serverLogger.error({
        event: 'assets.upload.db_error',
        userId: user.id,
        projectId,
        assetId,
        filePath,
        error: dbError.message,
        code: dbError.code,
      }, 'Failed to create asset record in database');
      // Try to delete the uploaded file
      await supabase.storage.from('assets').remove([filePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'assets.upload.success',
      userId: user.id,
      projectId,
      assetId,
      assetType: type,
      fileSize: file.size,
      fileName: file.name,
      mimeType: file.type,
      storageUrl,
      duration,
    }, `Asset uploaded successfully in ${duration}ms`);

    // Log to activity history
    const activityTypeMap: Record<string, string> = {
      image: 'image_upload',
      video: 'video_upload',
      audio: 'audio_upload',
    };

    await supabase.from('user_activity_history').insert({
      user_id: user.id,
      project_id: projectId,
      activity_type: activityTypeMap[type] || 'image_upload',
      title: originalName || fileName,
      description: `Uploaded ${type}`,
      asset_id: assetId,
      metadata: {
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      assetId,
      storageUrl,
      publicUrl,
      success: true,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'assets.upload.error',
      error,
      duration,
    }, 'Asset upload error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
