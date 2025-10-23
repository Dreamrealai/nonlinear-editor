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
    const projectId = formData.get('projectId') as string;
    const type = formData.get('type') as string || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${projectId}/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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

    // Create asset record in database
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
        file_path: filePath,
        mime_type: file.type,
        width,
        height,
        source: 'upload',
        metadata: {
          filename: file.name,
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
