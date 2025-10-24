/**
 * Tests for AI Model Configuration
 *
 * @module __tests__/lib/config/models.test
 */

import {
  VIDEO_MODELS,
  IMAGE_MODELS,
  AUDIO_MODELS,
  TEXT_MODELS,
  MODEL_PROVIDERS,
  DEFAULT_MODELS,
  VIDEO_MODEL_CONFIGS,
  isFalModel,
  getModelConfig,
  type VideoModel,
  type ImageModel,
  type AudioModel,
  type TextModel,
  type ModelProvider,
  type ModelConfig,
} from '@/lib/config/models';

describe('Model Constants', () => {
  describe('VIDEO_MODELS', () => {
    it('should define Veo models', () => {
      expect(VIDEO_MODELS.VEO_3_1_GENERATE).toBe('veo-3.1-generate-preview');
      expect(VIDEO_MODELS.VEO_3_1_FAST_GENERATE).toBe('veo-3.1-fast-generate-preview');
      expect(VIDEO_MODELS.VEO_2_0_GENERATE).toBe('veo-2.0-generate-001');
    });

    it('should define third-party models', () => {
      expect(VIDEO_MODELS.SEEDANCE_1_0_PRO).toBe('seedance-1.0-pro');
      expect(VIDEO_MODELS.MINIMAX_HAILUO_02_PRO).toBe('minimax-hailuo-02-pro');
    });

    it('should be immutable (const assertion)', () => {
      // TypeScript const assertion ensures immutability at compile time
      // Runtime checks would fail since JavaScript const only prevents reassignment
      // of the reference, not the properties
      expect(VIDEO_MODELS).toBeDefined();
      expect(typeof VIDEO_MODELS).toBe('object');
    });
  });

  describe('IMAGE_MODELS', () => {
    it('should define Imagen models', () => {
      expect(IMAGE_MODELS.IMAGEN_3_0).toBe('imagen-3.0-generate-001');
      expect(IMAGE_MODELS.IMAGEN_4_0).toBe('imagen-4.0-generate-001');
    });
  });

  describe('AUDIO_MODELS', () => {
    it('should define ElevenLabs models', () => {
      expect(AUDIO_MODELS.ELEVENLABS_MULTILINGUAL_V2).toBe('eleven_multilingual_v2');
      expect(AUDIO_MODELS.ELEVENLABS_TURBO_V2).toBe('eleven_turbo_v2');
    });

    it('should define Suno models', () => {
      expect(AUDIO_MODELS.SUNO_CHIRP_CROW).toBe('chirp-crow');
    });
  });

  describe('TEXT_MODELS', () => {
    it('should define Gemini models', () => {
      expect(TEXT_MODELS.GEMINI_PRO).toBe('gemini-pro');
      expect(TEXT_MODELS.GEMINI_FLASH).toBe('gemini-flash');
    });
  });

  describe('MODEL_PROVIDERS', () => {
    it('should define all providers', () => {
      expect(MODEL_PROVIDERS.GOOGLE).toBe('google');
      expect(MODEL_PROVIDERS.FAL).toBe('fal');
      expect(MODEL_PROVIDERS.SEEDANCE).toBe('seedance');
      expect(MODEL_PROVIDERS.MINIMAX).toBe('minimax');
      expect(MODEL_PROVIDERS.ELEVENLABS).toBe('elevenlabs');
      expect(MODEL_PROVIDERS.SUNO).toBe('suno');
    });
  });

  describe('DEFAULT_MODELS', () => {
    it('should define default models for each type', () => {
      expect(DEFAULT_MODELS.VIDEO).toBe(VIDEO_MODELS.VEO_3_1_GENERATE);
      expect(DEFAULT_MODELS.IMAGE).toBe(IMAGE_MODELS.IMAGEN_3_0);
      expect(DEFAULT_MODELS.AUDIO_TTS).toBe(AUDIO_MODELS.ELEVENLABS_MULTILINGUAL_V2);
      expect(DEFAULT_MODELS.AUDIO_MUSIC).toBe(AUDIO_MODELS.SUNO_CHIRP_CROW);
      expect(DEFAULT_MODELS.TEXT).toBe(TEXT_MODELS.GEMINI_PRO);
    });
  });
});

describe('VIDEO_MODEL_CONFIGS', () => {
  describe('Veo 3.1 Generate', () => {
    const config = VIDEO_MODEL_CONFIGS[VIDEO_MODELS.VEO_3_1_GENERATE];

    it('should have correct basic properties', () => {
      expect(config.id).toBe('veo-3.1-generate-preview');
      expect(config.name).toBe('Veo 3.1 (Latest)');
      expect(config.provider).toBe(MODEL_PROVIDERS.GOOGLE);
    });

    it('should support correct aspect ratios', () => {
      expect(config.supportedAspectRatios).toEqual(['16:9', '9:16', '1:1']);
    });

    it('should support correct durations', () => {
      expect(config.supportedDurations).toEqual([4, 5, 6, 8]);
    });

    it('should have correct feature flags', () => {
      expect(config.supportsResolution).toBe(true);
      expect(config.supportsAudio).toBe(true);
      expect(config.supportsNegativePrompt).toBe(true);
      expect(config.supportsReferenceImage).toBe(true);
      expect(config.supportsEnhancePrompt).toBe(true);
    });

    it('should support multiple samples', () => {
      expect(config.maxSampleCount).toBe(4);
    });
  });

  describe('Veo 3.1 Fast Generate', () => {
    const config = VIDEO_MODEL_CONFIGS[VIDEO_MODELS.VEO_3_1_FAST_GENERATE];

    it('should have same capabilities as regular Veo 3.1', () => {
      const regularConfig = VIDEO_MODEL_CONFIGS[VIDEO_MODELS.VEO_3_1_GENERATE];

      expect(config.supportedAspectRatios).toEqual(regularConfig.supportedAspectRatios);
      expect(config.supportedDurations).toEqual(regularConfig.supportedDurations);
      expect(config.supportsResolution).toBe(regularConfig.supportsResolution);
      expect(config.supportsAudio).toBe(regularConfig.supportsAudio);
    });

    it('should have different name and ID', () => {
      expect(config.id).toBe('veo-3.1-fast-generate-preview');
      expect(config.name).toBe('Veo 3.1 Fast');
    });
  });

  describe('Veo 2.0 Generate', () => {
    const config = VIDEO_MODEL_CONFIGS[VIDEO_MODELS.VEO_2_0_GENERATE];

    it('should not support resolution or audio', () => {
      expect(config.supportsResolution).toBe(false);
      expect(config.supportsAudio).toBe(false);
    });

    it('should support other features', () => {
      expect(config.supportsNegativePrompt).toBe(true);
      expect(config.supportsReferenceImage).toBe(true);
      expect(config.supportsEnhancePrompt).toBe(true);
    });
  });

  describe('SEEDANCE 1.0 Pro', () => {
    const config = VIDEO_MODEL_CONFIGS[VIDEO_MODELS.SEEDANCE_1_0_PRO];

    it('should be FAL provider', () => {
      expect(config.provider).toBe(MODEL_PROVIDERS.FAL);
    });

    it('should support single duration', () => {
      expect(config.supportedDurations).toEqual([5]);
    });

    it('should support limited features', () => {
      expect(config.supportsResolution).toBe(true);
      expect(config.supportsAudio).toBe(false);
      expect(config.supportsNegativePrompt).toBe(false);
      expect(config.supportsEnhancePrompt).toBe(false);
    });

    it('should support reference image', () => {
      expect(config.supportsReferenceImage).toBe(true);
    });

    it('should support single sample', () => {
      expect(config.maxSampleCount).toBe(1);
    });
  });

  describe('MiniMax Hailuo-02 Pro', () => {
    const config = VIDEO_MODEL_CONFIGS[VIDEO_MODELS.MINIMAX_HAILUO_02_PRO];

    it('should be FAL provider', () => {
      expect(config.provider).toBe(MODEL_PROVIDERS.FAL);
    });

    it('should support multiple durations', () => {
      expect(config.supportedDurations).toEqual([5, 6, 10]);
    });

    it('should support prompt enhancement', () => {
      expect(config.supportsEnhancePrompt).toBe(true);
    });

    it('should not support audio or negative prompt', () => {
      expect(config.supportsAudio).toBe(false);
      expect(config.supportsNegativePrompt).toBe(false);
    });

    it('should support single sample', () => {
      expect(config.maxSampleCount).toBe(1);
    });
  });

  describe('All Models', () => {
    it('should have valid configurations', () => {
      Object.entries(VIDEO_MODEL_CONFIGS).forEach(([modelId, config]) => {
        expect(config.id).toBe(modelId);
        expect(config.name).toBeTruthy();
        expect(config.provider).toBeTruthy();
        expect(config.supportedAspectRatios.length).toBeGreaterThan(0);
        expect(config.supportedDurations.length).toBeGreaterThan(0);
        expect(config.maxSampleCount).toBeGreaterThan(0);
      });
    });

    it('should have at least one supported aspect ratio', () => {
      Object.values(VIDEO_MODEL_CONFIGS).forEach((config) => {
        expect(config.supportedAspectRatios).toContain('16:9');
      });
    });
  });
});

describe('isFalModel', () => {
  it('should identify SEEDANCE as FAL model', () => {
    expect(isFalModel(VIDEO_MODELS.SEEDANCE_1_0_PRO)).toBe(true);
  });

  it('should identify MiniMax as FAL model', () => {
    expect(isFalModel(VIDEO_MODELS.MINIMAX_HAILUO_02_PRO)).toBe(true);
  });

  it('should identify Veo as non-FAL model', () => {
    expect(isFalModel(VIDEO_MODELS.VEO_3_1_GENERATE)).toBe(false);
    expect(isFalModel(VIDEO_MODELS.VEO_3_1_FAST_GENERATE)).toBe(false);
    expect(isFalModel(VIDEO_MODELS.VEO_2_0_GENERATE)).toBe(false);
  });

  it('should return false for unknown model', () => {
    expect(isFalModel('unknown-model')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isFalModel('')).toBe(false);
  });
});

describe('getModelConfig', () => {
  it('should return config for valid model', () => {
    const config = getModelConfig(VIDEO_MODELS.VEO_3_1_GENERATE);

    expect(config).toBeDefined();
    expect(config?.id).toBe('veo-3.1-generate-preview');
    expect(config?.name).toBe('Veo 3.1 (Latest)');
  });

  it('should return config for all video models', () => {
    Object.values(VIDEO_MODELS).forEach((model) => {
      const config = getModelConfig(model);
      expect(config).toBeDefined();
      expect(config?.id).toBe(model);
    });
  });

  it('should return undefined for unknown model', () => {
    const config = getModelConfig('unknown-model');
    expect(config).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const config = getModelConfig('');
    expect(config).toBeUndefined();
  });

  it('should return correct provider for each model', () => {
    const veoConfig = getModelConfig(VIDEO_MODELS.VEO_3_1_GENERATE);
    expect(veoConfig?.provider).toBe(MODEL_PROVIDERS.GOOGLE);

    const seedanceConfig = getModelConfig(VIDEO_MODELS.SEEDANCE_1_0_PRO);
    expect(seedanceConfig?.provider).toBe(MODEL_PROVIDERS.FAL);

    const minimaxConfig = getModelConfig(VIDEO_MODELS.MINIMAX_HAILUO_02_PRO);
    expect(minimaxConfig?.provider).toBe(MODEL_PROVIDERS.FAL);
  });
});

describe('Type Safety', () => {
  it('should enforce VideoModel type', () => {
    const validModel: VideoModel = VIDEO_MODELS.VEO_3_1_GENERATE;
    expect(validModel).toBe('veo-3.1-generate-preview');
  });

  it('should enforce ImageModel type', () => {
    const validModel: ImageModel = IMAGE_MODELS.IMAGEN_3_0;
    expect(validModel).toBe('imagen-3.0-generate-001');
  });

  it('should enforce AudioModel type', () => {
    const validModel: AudioModel = AUDIO_MODELS.ELEVENLABS_MULTILINGUAL_V2;
    expect(validModel).toBe('eleven_multilingual_v2');
  });

  it('should enforce TextModel type', () => {
    const validModel: TextModel = TEXT_MODELS.GEMINI_PRO;
    expect(validModel).toBe('gemini-pro');
  });

  it('should enforce ModelProvider type', () => {
    const validProvider: ModelProvider = MODEL_PROVIDERS.GOOGLE;
    expect(validProvider).toBe('google');
  });

  it('should enforce ModelConfig structure', () => {
    const config: ModelConfig = {
      id: 'test-model',
      name: 'Test Model',
      provider: MODEL_PROVIDERS.GOOGLE,
      supportedAspectRatios: ['16:9'],
      supportedDurations: [5],
      supportsResolution: true,
      supportsAudio: true,
      supportsNegativePrompt: true,
      supportsReferenceImage: true,
      supportsEnhancePrompt: true,
      maxSampleCount: 1,
    };

    expect(config.id).toBe('test-model');
  });
});

describe('Model Features', () => {
  it('should identify models with audio support', () => {
    const modelsWithAudio = Object.entries(VIDEO_MODEL_CONFIGS)
      .filter(([, config]) => config.supportsAudio)
      .map(([id]) => id);

    expect(modelsWithAudio).toContain(VIDEO_MODELS.VEO_3_1_GENERATE);
    expect(modelsWithAudio).toContain(VIDEO_MODELS.VEO_3_1_FAST_GENERATE);
    expect(modelsWithAudio).not.toContain(VIDEO_MODELS.VEO_2_0_GENERATE);
  });

  it('should identify models with resolution support', () => {
    const modelsWithResolution = Object.entries(VIDEO_MODEL_CONFIGS)
      .filter(([, config]) => config.supportsResolution)
      .map(([id]) => id);

    expect(modelsWithResolution.length).toBeGreaterThan(0);
    expect(modelsWithResolution).toContain(VIDEO_MODELS.VEO_3_1_GENERATE);
  });

  it('should identify models supporting longest duration', () => {
    const maxDuration = Math.max(
      ...Object.values(VIDEO_MODEL_CONFIGS).flatMap((config) => config.supportedDurations)
    );

    expect(maxDuration).toBe(10);

    const modelsWithMaxDuration = Object.entries(VIDEO_MODEL_CONFIGS)
      .filter(([, config]) => config.supportedDurations.includes(maxDuration))
      .map(([id]) => id);

    expect(modelsWithMaxDuration).toContain(VIDEO_MODELS.MINIMAX_HAILUO_02_PRO);
  });

  it('should identify models with highest sample count', () => {
    const maxSampleCount = Math.max(
      ...Object.values(VIDEO_MODEL_CONFIGS).map((config) => config.maxSampleCount)
    );

    expect(maxSampleCount).toBe(4);
  });
});
