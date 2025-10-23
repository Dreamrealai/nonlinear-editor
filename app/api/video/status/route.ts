import { NextRequest, NextResponse } from 'next/server';
import { checkOperationStatus } from '@/lib/veo';
import { checkFalVideoStatus } from '@/lib/fal-video';
import { createServerSupabaseClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { GoogleAuth } from 'google-auth-library';

const normalizeStorageUrl = (bucket: string, path: string) => `supabase://${bucket}/${path}`;

const parseGcsUri = (uri: string) => {
  const normalized = uri.replace(/^gs:\/\//, '');
  const [bucket, ...rest] = normalized.split('/');
  if (!bucket || rest.length === 0) {
    return null;
  }
  return { bucket, objectPath: rest.join('/') };
};

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const operationName = searchParams.get('operationName');
    const projectId = searchParams.get('projectId');

    if (!operationName) {
      return NextResponse.json({ error: 'Operation name is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Determine if this is a FAL operation or Veo operation
    const isFalOperation = operationName.startsWith('fal:');

    if (isFalOperation) {
      // Parse FAL operation name: fal:endpoint:requestId
      const parts = operationName.split(':');
      if (parts.length < 3) {
        return NextResponse.json({ error: 'Invalid FAL operation name format' }, { status: 400 });
      }
      const endpoint = parts.slice(1, -1).join(':'); // Reconstruct endpoint (may contain colons)
      const requestId = parts[parts.length - 1];

      // Check FAL operation status
      const falResult = await checkFalVideoStatus(requestId, endpoint);

      if (falResult.done && falResult.result) {
        // Download video from FAL URL and upload to Supabase
        const videoUrl = falResult.result.video.url;

        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download FAL video: ${videoResponse.status}`);
        }

        const videoBinary = Buffer.from(await videoResponse.arrayBuffer());
        const fileName = `${uuidv4()}.mp4`;
        const storagePath = `${user.id}/${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(storagePath, videoBinary, {
            contentType: falResult.result.video.content_type || 'video/mp4',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('assets').getPublicUrl(storagePath);

        const storageUrl = normalizeStorageUrl('assets', storagePath);

        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .insert({
            user_id: user.id,
            project_id: projectId,
            type: 'video',
            source: 'genai',
            storage_url: storageUrl,
            metadata: {
              filename: fileName,
              mimeType: falResult.result.video.content_type || 'video/mp4',
              sourceUrl: publicUrl,
              generator: endpoint.includes('seedance') ? 'seedance-pro' : 'minimax-video-01-live',
            },
          })
          .select()
          .single();

        if (assetError) {
          throw new Error(`Asset creation failed: ${assetError.message}`);
        }

        // Log to activity history
        await supabase.from('user_activity_history').insert({
          user_id: user.id,
          project_id: projectId,
          activity_type: 'video_generation',
          title: 'Video Generated',
          model: endpoint.includes('seedance') ? 'seedance-pro' : 'minimax-video-01-live',
          asset_id: asset.id,
          metadata: {
            mimeType: falResult.result.video.content_type || 'video/mp4',
          },
        });

        return NextResponse.json({
          done: true,
          asset,
          storageUrl: publicUrl,
        });
      }

      if (falResult.error) {
        return NextResponse.json({
          done: true,
          error: falResult.error,
        });
      }

      // Still processing
      return NextResponse.json({
        done: false,
        progress: 0,
      });
    }

    // Check Veo operation status
    const result = await checkOperationStatus(operationName);

    if (result.done && result.response) {
      const videoArtifact = result.response.videos?.[0];
      const mimeType = videoArtifact?.mimeType || 'video/mp4';
      let videoBinary: Buffer | null = null;

      if (videoArtifact?.bytesBase64Encoded) {
        videoBinary = Buffer.from(videoArtifact.bytesBase64Encoded, 'base64');
      }

      const gcsUri = videoArtifact?.gcsUri;

      if (!videoBinary && gcsUri) {
        const parsed = parseGcsUri(gcsUri);
        if (!parsed) {
          throw new Error('Invalid GCS URI returned by Veo');
        }

        const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
        if (!serviceAccountJson) {
          throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is required to download Veo output');
        }

        const serviceAccount = JSON.parse(serviceAccountJson);
        const auth = new GoogleAuth({
          credentials: serviceAccount,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        const client = await auth.getClient();
        const { token } = await client.getAccessToken();

        if (!token) {
          throw new Error('Failed to obtain Google access token');
        }

        const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(parsed.bucket)}/o/${encodeURIComponent(parsed.objectPath)}?alt=media`;
        const downloadResponse = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!downloadResponse.ok) {
          const detail = await downloadResponse.text().catch(() => '');
          throw new Error(`Failed to download Veo video: ${downloadResponse.status} ${detail}`.trim());
        }

        const arrayBuffer = await downloadResponse.arrayBuffer();
        videoBinary = Buffer.from(arrayBuffer);
      }

      if (!videoBinary) {
        throw new Error('No downloadable video returned by Veo operation');
      }

      const fileName = `${uuidv4()}.mp4`;
      const storagePath = `${user.id}/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, videoBinary, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('assets').getPublicUrl(storagePath);

      const storageUrl = normalizeStorageUrl('assets', storagePath);

      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          project_id: projectId,
          type: 'video',
          source: 'genai',
          storage_url: storageUrl,
          metadata: {
            filename: fileName,
            mimeType,
            sourceUrl: publicUrl,
            generator: 'veo-3-1',
          },
        })
        .select()
        .single();

      if (assetError) {
        throw new Error(`Asset creation failed: ${assetError.message}`);
      }

      // Log to activity history
      await supabase.from('user_activity_history').insert({
        user_id: user.id,
        project_id: projectId,
        activity_type: 'video_generation',
        title: 'Video Generated',
        model: 'veo-3-1',
        asset_id: asset.id,
        metadata: {
          mimeType,
        },
      });

      return NextResponse.json({
        done: true,
        asset,
        storageUrl: publicUrl,
      });
    }

    // Still processing or error
    return NextResponse.json({
      done: result.done,
      progress: result.metadata?.progressPercentage || 0,
      error: result.error?.message,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}
