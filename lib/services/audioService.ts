/**
 * Audio Service Layer
 *
 * Handles all business logic related to audio operations:
 * - Text-to-speech generation (ElevenLabs)
 * - Music generation (Suno AI)
 * - Sound effects generation
 * - Audio asset management
 * - Audio status polling
 *
 * This service layer separates business logic from API route handlers,
 * making code more testable and maintainable.
 *
 * Usage:
 * ```typescript
 * import { AudioService } from '@/lib/services/audioService';
 *
 * const service = new AudioService(supabase);
 * const asset = await service.generateTTS(userId, projectId, options);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';
import { validateUUID } from '../validation';
import { serverLogger } from '../serverLogger';
import { ensureHttpsProtocol } from '../supabase';

export interface TTSGenerationOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarity?: number;
}

export interface TTSAssetMetadata {
  filename: string;
  mimeType: string;
  duration?: number;
  provider: string;
  voiceId?: string;
  modelId?: string;
  text?: string;
  [key: string]: unknown;
}

export interface AudioAssetRecord {
  id: string;
  storage_url: string;
  metadata: TTSAssetMetadata;
  type: 'audio';
  created_at: string;
  user_id: string;
  project_id: string;
  source: string;
  mime_type: string;
  [key: string]: unknown;
}

export interface TTSGenerationResult {
  success: boolean;
  asset: AudioAssetRecord;
  message: string;
}

export interface MusicGenerationOptions {
  prompt: string;
  duration?: number;
  makeInstrumental?: boolean;
  customMode?: boolean;
  tags?: string;
}

export interface MusicGenerationResult {
  operationId: string;
  status: string;
  message: string;
}

export interface SFXGenerationOptions {
  text: string;
  duration?: number;
  promptInfluence?: number;
}

export class AudioService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generate speech from text using ElevenLabs TTS
   *
   * @param userId - User ID generating the audio
   * @param projectId - Project ID to associate audio with
   * @param options - TTS generation options
   * @returns Generation result with created asset
   * @throws Error if generation or upload fails
   *
   * @example
   * const result = await audioService.generateTTS(userId, projectId, {
   *   text: "Hello, world!",
   *   voiceId: "EXAVITQu4vr4xnSDxMaL"
   * });
   */
  async generateTTS(
    userId: string,
    projectId: string,
    options: TTSGenerationOptions
  ): Promise<TTSGenerationResult> {
    try {
      validateUUID(projectId, 'Project ID');

      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const {
        text,
        voiceId = 'EXAVITQu4vr4xnSDxMaL', // Default voice: Sarah
        modelId = 'eleven_multilingual_v2',
        stability = 0.5,
        similarity = 0.75,
      } = options;

      serverLogger.info(
        {
          event: 'audio.service.tts_started',
          userId,
          projectId,
          voiceId,
          modelId,
        },
        'Starting TTS generation'
      );

      // Call ElevenLabs API with timeout
      const controller = new AbortController();
      const timeout = setTimeout((): void => controller.abort(), 60000);

      let response;
      try {
        response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability,
              similarity_boost: similarity,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`ElevenLabs API error: ${error}`);
        }
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('TTS generation timeout after 60s');
        }
        throw error;
      }

      // Get the audio data
      const audioData = await response.arrayBuffer();

      // Upload to storage and create asset
      const asset = await this.uploadAudioAsset(userId, projectId, Buffer.from(audioData), {
        filename: `elevenlabs_${Date.now()}.mp3`,
        mimeType: 'audio/mpeg',
        provider: 'elevenlabs',
        voiceId,
        modelId,
        text: text.substring(0, 200), // Store first 200 chars
      });

      return {
        success: true,
        asset,
        message: 'Audio generated successfully',
      };
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { userId, projectId, operation: 'generateTTS' },
      });
      throw error;
    }
  }

  /**
   * Generate music using Suno AI
   *
   * @param userId - User ID generating the music
   * @param projectId - Project ID to associate music with
   * @param options - Music generation options
   * @returns Operation details for status polling
   * @throws Error if generation initiation fails
   *
   * @example
   * const result = await audioService.generateMusic(userId, projectId, {
   *   prompt: "Upbeat electronic dance music",
   *   duration: 30
   * });
   */
  async generateMusic(
    userId: string,
    projectId: string,
    options: MusicGenerationOptions
  ): Promise<MusicGenerationResult> {
    try {
      validateUUID(projectId, 'Project ID');

      serverLogger.info(
        {
          event: 'audio.service.music_started',
          userId,
          projectId,
          duration: options.duration,
        },
        'Starting music generation'
      );

      // This would call Suno AI API
      // For now, return a placeholder structure
      throw new Error('Music generation not yet implemented');
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { userId, projectId, operation: 'generateMusic' },
      });
      throw error;
    }
  }

  /**
   * Generate sound effects using ElevenLabs
   *
   * @param userId - User ID generating the sound effect
   * @param projectId - Project ID to associate SFX with
   * @param options - SFX generation options
   * @returns Generation result with created asset
   * @throws Error if generation or upload fails
   *
   * @example
   * const result = await audioService.generateSFX(userId, projectId, {
   *   text: "Door creaking open",
   *   duration: 3
   * });
   */
  async generateSFX(
    userId: string,
    projectId: string,
    options: SFXGenerationOptions
  ): Promise<TTSGenerationResult> {
    try {
      validateUUID(projectId, 'Project ID');

      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const { text, duration = 5, promptInfluence = 0.5 } = options;

      serverLogger.info(
        {
          event: 'audio.service.sfx_started',
          userId,
          projectId,
          duration,
        },
        'Starting SFX generation'
      );

      // Call ElevenLabs SFX API
      const controller = new AbortController();
      const timeout = setTimeout((): void => controller.abort(), 90000); // 90s timeout for SFX

      let response;
      try {
        response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            duration_seconds: duration,
            prompt_influence: promptInfluence,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`ElevenLabs SFX API error: ${error}`);
        }
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('SFX generation timeout after 90s');
        }
        throw error;
      }

      // Get the audio data
      const audioData = await response.arrayBuffer();

      // Upload to storage and create asset
      const asset = await this.uploadAudioAsset(userId, projectId, Buffer.from(audioData), {
        filename: `sfx_${Date.now()}.mp3`,
        mimeType: 'audio/mpeg',
        provider: 'elevenlabs-sfx',
        text: text.substring(0, 200),
        duration,
      });

      return {
        success: true,
        asset,
        message: 'Sound effect generated successfully',
      };
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { userId, projectId, operation: 'generateSFX' },
      });
      throw error;
    }
  }

  /**
   * Upload audio buffer to storage and create asset record
   *
   * @param userId - User ID who owns the asset
   * @param projectId - Project ID to associate with
   * @param audioBinary - Audio file binary data
   * @param metadata - Asset metadata
   * @returns Created asset record
   * @throws Error if upload or database insert fails
   */
  private async uploadAudioAsset(
    userId: string,
    projectId: string,
    audioBinary: Buffer,
    metadata: {
      filename: string;
      mimeType: string;
      provider: string;
      [key: string]: unknown;
    }
  ): Promise<AudioAssetRecord> {
    const filePath = `${userId}/${projectId}/audio/${metadata.filename}`;

    // Upload to storage
    const { error: uploadError } = await this.supabase.storage
      .from('assets')
      .upload(filePath, audioBinary, {
        contentType: metadata.mimeType,
        upsert: false,
      });

    if (uploadError) {
      trackError(uploadError, {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        context: { userId, projectId, filePath },
      });
      throw new Error(`Failed to upload audio to storage: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl: rawPublicUrl },
    } = this.supabase.storage.from('assets').getPublicUrl(filePath);
    const publicUrl = ensureHttpsProtocol(rawPublicUrl);

    const storageUrl = `supabase://assets/${filePath}`;

    // Create asset record
    const { data: assetData, error: assetError } = await this.supabase
      .from('assets')
      .insert({
        project_id: projectId,
        user_id: userId,
        storage_url: storageUrl,
        type: 'audio',
        source: 'genai',
        mime_type: metadata.mimeType,
        metadata: {
          ...metadata,
          sourceUrl: publicUrl,
        },
      })
      .select()
      .single();

    if (assetError) {
      // Clean up uploaded file
      await this.supabase.storage.from('assets').remove([filePath]);

      trackError(assetError, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { userId, projectId, filePath },
      });
      throw new Error(`Failed to save asset to database: ${assetError.message}`);
    }

    return assetData;
  }

  /**
   * Delete an audio asset
   *
   * @param assetId - Asset ID to delete
   * @param userId - User ID for ownership verification
   * @throws Error if deletion fails
   *
   * @example
   * await audioService.deleteAudio(assetId, userId);
   */
  async deleteAudio(assetId: string, userId: string): Promise<void> {
    try {
      validateUUID(assetId, 'Asset ID');

      // Fetch asset to get storage path
      const { data: asset, error: fetchError } = await this.supabase
        .from('assets')
        .select('storage_url, type')
        .eq('id', assetId)
        .eq('user_id', userId)
        .eq('type', 'audio')
        .single();

      if (fetchError || !asset) {
        throw new Error('Audio asset not found or access denied');
      }

      // Extract storage path
      const storageUrl = (asset as { storage_url: string }).storage_url;
      const storagePath = storageUrl.replace('supabase://assets/', '');

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from('assets')
        .remove([storagePath]);

      if (storageError) {
        serverLogger.error(
          {
            event: 'audio.service.delete_storage_error',
            assetId,
            userId,
            error: storageError,
          },
          'Failed to delete audio from storage'
        );
        // Continue to delete database record
      }

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('assets')
        .delete()
        .eq('id', assetId)
        .eq('user_id', userId);

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { assetId, userId },
        });
        throw new Error(`Failed to delete audio asset: ${dbError.message}`);
      }
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { assetId, userId, operation: 'deleteAudio' },
      });
      throw error;
    }
  }
}
