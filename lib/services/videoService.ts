/**
 * Video Service Layer
 *
 * Handles all business logic related to video operations:
 * - Video generation (Google Veo, FAL.ai providers)
 * - Video status polling
 * - Video upscaling operations
 * - Video asset management
 * - Provider-specific video generation
 *
 * This service layer separates business logic from API route handlers,
 * making code more testable and maintainable.
 *
 * Usage:
 * ```typescript
 * import { VideoService } from '@/lib/services/videoService';
 *
 * const service = new VideoService(supabase);
 * const operation = await service.generateVideo(userId, projectId, options);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';
import { validateUUID } from '../validation';
import { serverLogger } from '../serverLogger';
import { generateVideo } from '../veo';
import { generateFalVideo } from '../fal-video';
import { checkOperationStatus } from '../veo';
import { checkFalVideoStatus } from '../fal-video';
import { ensureHttpsProtocol } from '../supabase';

export interface VideoGenerationOptions {
  prompt: string;
  model: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number;
  resolution?: '480p' | '720p' | '1080p';
  negativePrompt?: string;
  personGeneration?: 'allow_adult' | 'dont_allow';
  enhancePrompt?: boolean;
  generateAudio?: boolean;
  seed?: number;
  sampleCount?: number;
  compressionQuality?: 'optimized' | 'lossless';
  imageUrl?: string;
}

export interface VideoGenerationResult {
  operationName: string;
  status: string;
  message: string;
}

export interface VideoStatusResult {
  done: boolean;
  progress?: number;
  error?: string;
  asset?: {
    id: string;
    type: string;
    storage_url: string;
    [key: string]: unknown;
  };
  storageUrl?: string;
}

const MODEL_DEFINITIONS = {
  'veo-3.1-generate-preview': { provider: 'veo', supportsAudio: true },
  'veo-3.1-fast-generate-preview': { provider: 'veo', supportsAudio: true },
  'veo-2.0-generate-001': { provider: 'veo', supportsAudio: false },
  'seedance-1.0-pro': { provider: 'fal', supportsAudio: false },
  'minimax-hailuo-02-pro': { provider: 'fal', supportsAudio: false },
} as const;

export class VideoService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generate a video using AI providers (Google Veo or FAL.ai)
   *
   * @param userId - User ID generating the video
   * @param projectId - Project ID to associate video with
   * @param options - Video generation options
   * @returns Video generation operation details
   * @throws Error if generation fails
   *
   * @example
   * const result = await videoService.generateVideo(userId, projectId, {
   *   prompt: "A serene lake at sunset",
   *   model: "veo-002",
   *   duration: 5
   * });
   */
  async generateVideo(
    userId: string,
    projectId: string,
    options: VideoGenerationOptions
  ): Promise<VideoGenerationResult> {
    try {
      validateUUID(projectId, 'Project ID');

      const modelConfig = MODEL_DEFINITIONS[options.model as keyof typeof MODEL_DEFINITIONS];

      if (!modelConfig) {
        throw new Error('Unsupported video generation model');
      }

      const provider = modelConfig.provider;
      const shouldGenerateAudio = modelConfig.supportsAudio
        ? options.generateAudio !== false
        : false;

      serverLogger.info(
        {
          event: 'video.service.generate_started',
          userId,
          projectId,
          model: options.model,
          provider,
        },
        `Starting video generation with ${provider}`
      );

      if (provider === 'fal') {
        // Use FAL.ai for Seedance and MiniMax models
        const result = await generateFalVideo({
          prompt: options.prompt,
          model: options.model,
          aspectRatio: options.aspectRatio,
          duration: options.duration,
          resolution: options.resolution,
          imageUrl: options.imageUrl,
          promptOptimizer: options.enhancePrompt,
        });

        return {
          operationName: `fal:${result.endpoint}:${result.requestId}`,
          status: 'processing',
          message: 'Video generation started. Use the operation name to check status.',
        };
      } else {
        // Use Google Veo for Google models
        // Veo only supports 720p and 1080p, filter out 480p if provided
        const veoSupportedResolutions = ['720p', '1080p'] as const;
        const resolution =
          options.resolution &&
          veoSupportedResolutions.includes(
            options.resolution as (typeof veoSupportedResolutions)[number]
          )
            ? (options.resolution as '720p' | '1080p')
            : undefined;

        const result = await generateVideo({
          prompt: options.prompt,
          model: options.model,
          aspectRatio: options.aspectRatio,
          duration: options.duration,
          resolution,
          negativePrompt: options.negativePrompt,
          personGeneration: options.personGeneration,
          enhancePrompt: options.enhancePrompt,
          generateAudio: shouldGenerateAudio,
          seed: options.seed,
          sampleCount: options.sampleCount,
          compressionQuality: options.compressionQuality,
          imageUrl: options.imageUrl,
        });

        return {
          operationName: result.name,
          status: 'processing',
          message: 'Video generation started. Use the operation name to check status.',
        };
      }
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { userId, projectId, model: options.model },
      });
      throw error;
    }
  }

  /**
   * Check the status of a video generation operation
   *
   * Polls the status and creates an asset record when complete.
   *
   * @param userId - User ID who initiated the generation
   * @param projectId - Project ID to associate the video with
   * @param operationName - Operation identifier from generateVideo
   * @returns Status result with asset data if complete
   * @throws Error if status check or asset creation fails
   *
   * @example
   * const status = await videoService.checkVideoStatus(userId, projectId, operationName);
   * if (status.done && status.asset) {
   *   // Video is ready
   * }
   */
  async checkVideoStatus(
    userId: string,
    projectId: string,
    operationName: string
  ): Promise<VideoStatusResult> {
    try {
      validateUUID(projectId, 'Project ID');

      const isFalOperation = operationName.startsWith('fal:');

      if (isFalOperation) {
        return await this.checkFalVideoStatus(userId, projectId, operationName);
      } else {
        return await this.checkVeoVideoStatus(userId, projectId, operationName);
      }
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId, projectId, operationName },
      });
      throw error;
    }
  }

  /**
   * Check FAL.ai video generation status
   */
  private async checkFalVideoStatus(
    userId: string,
    projectId: string,
    operationName: string
  ): Promise<VideoStatusResult> {
    // Parse FAL operation name: fal:endpoint:requestId
    const parts = operationName.split(':');
    if (parts.length < 3) {
      throw new Error('Invalid FAL operation name format');
    }

    const endpoint = parts.slice(1, -1).join(':');
    const requestId = parts[parts.length - 1];

    if (!requestId) {
      throw new Error('Invalid FAL request ID');
    }

    const falResult = await checkFalVideoStatus(requestId, endpoint);

    if (falResult.done && falResult.result) {
      // Download video and create asset
      const videoUrl = falResult.result.video.url;
      const asset = await this.downloadAndCreateVideoAsset(userId, projectId, videoUrl, {
        mimeType: falResult.result.video.content_type || 'video/mp4',
        generator: endpoint.includes('seedance') ? 'seedance-pro' : 'minimax-video-01-live',
      });

      // Log to activity history
      await this.logVideoGeneration(userId, projectId, asset.id, {
        model: endpoint.includes('seedance') ? 'seedance-pro' : 'minimax-video-01-live',
        mimeType: falResult.result.video.content_type || 'video/mp4',
      });

      return {
        done: true,
        asset,
        storageUrl: ensureHttpsProtocol(asset.metadata?.sourceUrl as string),
      };
    }

    if (falResult.error) {
      return {
        done: true,
        error: falResult.error,
      };
    }

    return {
      done: false,
      progress: 0,
    };
  }

  /**
   * Check Google Veo video generation status
   */
  private async checkVeoVideoStatus(
    userId: string,
    projectId: string,
    operationName: string
  ): Promise<VideoStatusResult> {
    const result = await checkOperationStatus(operationName);

    if (result.done && result.response) {
      const videoArtifact = result.response.videos?.[0];
      const mimeType = videoArtifact?.mimeType || 'video/mp4';

      // Get video binary (either from base64 or GCS URI)
      let videoBinary: Buffer;

      if (videoArtifact?.bytesBase64Encoded) {
        videoBinary = Buffer.from(videoArtifact.bytesBase64Encoded, 'base64');
      } else if (videoArtifact?.gcsUri) {
        videoBinary = await this.downloadFromGCS(videoArtifact.gcsUri);
      } else {
        throw new Error('No downloadable video returned by Veo operation');
      }

      // Upload to storage and create asset
      const asset = await this.uploadAndCreateVideoAsset(userId, projectId, videoBinary, {
        mimeType,
        generator: 'veo',
      });

      // Log to activity history
      await this.logVideoGeneration(userId, projectId, asset.id, {
        model: 'veo',
        mimeType,
      });

      return {
        done: true,
        asset,
        storageUrl: ensureHttpsProtocol(asset.metadata?.sourceUrl as string),
      };
    }

    return {
      done: result.done,
      progress: result.metadata?.progressPercentage || 0,
      error: result.error?.message,
    };
  }

  /**
   * Download video from URL and create asset record
   */
  private async downloadAndCreateVideoAsset(
    userId: string,
    projectId: string,
    videoUrl: string,
    metadata: { mimeType: string; generator: string }
  ) {
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBinary = Buffer.from(await videoResponse.arrayBuffer());
    return await this.uploadAndCreateVideoAsset(userId, projectId, videoBinary, metadata);
  }

  /**
   * Upload video to storage and create asset record
   */
  private async uploadAndCreateVideoAsset(
    userId: string,
    projectId: string,
    videoBinary: Buffer,
    metadata: { mimeType: string; generator: string }
  ) {
    const fileName = `${uuidv4()}.mp4`;
    const storagePath = `${userId}/${projectId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await this.supabase.storage
      .from('assets')
      .upload(storagePath, videoBinary, {
        contentType: metadata.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl: rawPublicUrl },
    } = this.supabase.storage.from('assets').getPublicUrl(storagePath);
    const publicUrl = ensureHttpsProtocol(rawPublicUrl);

    const storageUrl = `supabase://assets/${storagePath}`;

    // Create asset record
    const { data: asset, error: assetError } = await this.supabase
      .from('assets')
      .insert({
        user_id: userId,
        project_id: projectId,
        type: 'video',
        source: 'genai',
        storage_url: storageUrl,
        metadata: {
          filename: fileName,
          mimeType: metadata.mimeType,
          sourceUrl: publicUrl,
          generator: metadata.generator,
        },
      })
      .select()
      .single();

    if (assetError) {
      // Clean up uploaded file
      await this.supabase.storage.from('assets').remove([storagePath]);
      throw new Error(`Asset creation failed: ${assetError.message}`);
    }

    return asset;
  }

  /**
   * Download video from Google Cloud Storage
   */
  private async downloadFromGCS(gcsUri: string): Promise<Buffer> {
    const { GoogleAuth } = await import('google-auth-library');

    const normalized = gcsUri.replace(/^gs:\/\//, '');
    const [bucket, ...rest] = normalized.split('/');
    if (!bucket || rest.length === 0) {
      throw new Error('Invalid GCS URI');
    }

    const objectPath = rest.join('/');

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is required');
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

    const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}?alt=media`;
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download from GCS: ${downloadResponse.status}`);
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Log video generation to activity history
   */
  private async logVideoGeneration(
    userId: string,
    projectId: string,
    assetId: string,
    metadata: { model: string; mimeType: string }
  ): Promise<void> {
    await this.supabase.from('user_activity_history').insert({
      user_id: userId,
      project_id: projectId,
      activity_type: 'video_generation',
      title: 'Video Generated',
      model: metadata.model,
      asset_id: assetId,
      metadata: {
        mimeType: metadata.mimeType,
      },
    });
  }
}
