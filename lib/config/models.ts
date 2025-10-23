/**
 * AI Model Configuration
 * Centralized configuration for all AI models used in the application
 */

/**
 * Video Generation Models
 */
export const VIDEO_MODELS = {
  // Google Veo Models
  VEO_3_1_GENERATE: 'veo-3.1-generate-preview',
  VEO_3_1_FAST_GENERATE: 'veo-3.1-fast-generate-preview',
  VEO_2_0_GENERATE: 'veo-2.0-generate-001',

  // OpenAI SORA
  SORA_2_PRO: 'sora-2-pro',

  // SEEDANCE (via fal.ai)
  SEEDANCE_1_0_PRO: 'seedance-1.0-pro',

  // MiniMax (via fal.ai)
  MINIMAX_HAILUO_02_PRO: 'minimax-hailuo-02-pro',
} as const;

export type VideoModel = typeof VIDEO_MODELS[keyof typeof VIDEO_MODELS];

/**
 * Image Generation Models
 */
export const IMAGE_MODELS = {
  // Google Imagen
  IMAGEN_3_0: 'imagen-3.0-generate-001',
  IMAGEN_4_0: 'imagen-4.0-generate-001',
} as const;

export type ImageModel = typeof IMAGE_MODELS[keyof typeof IMAGE_MODELS];

/**
 * Audio Generation Models
 */
export const AUDIO_MODELS = {
  // ElevenLabs
  ELEVENLABS_MULTILINGUAL_V2: 'eleven_multilingual_v2',
  ELEVENLABS_TURBO_V2: 'eleven_turbo_v2',

  // Suno
  SUNO_CHIRP_CROW: 'chirp-crow', // Suno V5
} as const;

export type AudioModel = typeof AUDIO_MODELS[keyof typeof AUDIO_MODELS];

/**
 * Text Generation Models (for prompt enhancement)
 */
export const TEXT_MODELS = {
  GEMINI_PRO: 'gemini-pro',
  GEMINI_FLASH: 'gemini-flash',
} as const;

export type TextModel = typeof TEXT_MODELS[keyof typeof TEXT_MODELS];

/**
 * Model Providers
 */
export const MODEL_PROVIDERS = {
  GOOGLE: 'google',
  OPENAI: 'openai',
  SEEDANCE: 'seedance',
  MINIMAX: 'minimax',
  FAL: 'fal',
  ELEVENLABS: 'elevenlabs',
  SUNO: 'suno',
} as const;

export type ModelProvider = typeof MODEL_PROVIDERS[keyof typeof MODEL_PROVIDERS];

/**
 * Default Models
 */
export const DEFAULT_MODELS = {
  VIDEO: VIDEO_MODELS.VEO_3_1_GENERATE,
  IMAGE: IMAGE_MODELS.IMAGEN_3_0,
  AUDIO_TTS: AUDIO_MODELS.ELEVENLABS_MULTILINGUAL_V2,
  AUDIO_MUSIC: AUDIO_MODELS.SUNO_CHIRP_CROW,
  TEXT: TEXT_MODELS.GEMINI_PRO,
} as const;

/**
 * Model Configuration Interface
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  supportedAspectRatios: ('16:9' | '9:16' | '1:1' | '3:4' | '4:3')[];
  supportedDurations: (4 | 5 | 6 | 8 | 10)[];
  supportsResolution: boolean;
  supportsAudio: boolean;
  supportsNegativePrompt: boolean;
  supportsReferenceImage: boolean;
  supportsEnhancePrompt: boolean;
  maxSampleCount: number;
}

/**
 * Video Model Configurations
 */
export const VIDEO_MODEL_CONFIGS: Record<string, ModelConfig> = {
  [VIDEO_MODELS.VEO_3_1_GENERATE]: {
    id: VIDEO_MODELS.VEO_3_1_GENERATE,
    name: 'Veo 3.1 (Latest)',
    provider: MODEL_PROVIDERS.GOOGLE,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: true,
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  [VIDEO_MODELS.VEO_3_1_FAST_GENERATE]: {
    id: VIDEO_MODELS.VEO_3_1_FAST_GENERATE,
    name: 'Veo 3.1 Fast',
    provider: MODEL_PROVIDERS.GOOGLE,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: true,
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  [VIDEO_MODELS.VEO_2_0_GENERATE]: {
    id: VIDEO_MODELS.VEO_2_0_GENERATE,
    name: 'Veo 2.0',
    provider: MODEL_PROVIDERS.GOOGLE,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [4, 5, 6, 8],
    supportsResolution: false,
    supportsAudio: false,
    supportsNegativePrompt: true,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 4,
  },
  [VIDEO_MODELS.SORA_2_PRO]: {
    id: VIDEO_MODELS.SORA_2_PRO,
    name: 'SORA 2 Pro',
    provider: MODEL_PROVIDERS.OPENAI,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [5, 10],
    supportsResolution: false,
    supportsAudio: false,
    supportsNegativePrompt: false,
    supportsReferenceImage: true,
    supportsEnhancePrompt: false,
    maxSampleCount: 1,
  },
  [VIDEO_MODELS.SEEDANCE_1_0_PRO]: {
    id: VIDEO_MODELS.SEEDANCE_1_0_PRO,
    name: 'SEEDANCE 1.0 Pro',
    provider: MODEL_PROVIDERS.SEEDANCE,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [5],
    supportsResolution: true,
    supportsAudio: false,
    supportsNegativePrompt: false,
    supportsReferenceImage: true,
    supportsEnhancePrompt: false,
    maxSampleCount: 1,
  },
  [VIDEO_MODELS.MINIMAX_HAILUO_02_PRO]: {
    id: VIDEO_MODELS.MINIMAX_HAILUO_02_PRO,
    name: 'MiniMax Hailuo-02 Pro',
    provider: MODEL_PROVIDERS.MINIMAX,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [5, 6, 10],
    supportsResolution: true,
    supportsAudio: false,
    supportsNegativePrompt: false,
    supportsReferenceImage: true,
    supportsEnhancePrompt: true,
    maxSampleCount: 1,
  },
};

/**
 * Helper function to check if a model is a FAL model
 */
export function isFalModel(model: string): boolean {
  return model === VIDEO_MODELS.SEEDANCE_1_0_PRO || model === VIDEO_MODELS.MINIMAX_HAILUO_02_PRO;
}

/**
 * Helper function to get model configuration
 */
export function getModelConfig(model: string): ModelConfig | undefined {
  return VIDEO_MODEL_CONFIGS[model];
}
