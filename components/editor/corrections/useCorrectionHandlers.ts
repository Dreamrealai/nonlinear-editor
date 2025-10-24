import { useCallback, useEffect } from 'react';
import type { Clip, Transform, AudioEffects, VideoEffects } from '@/types/timeline';

interface CorrectionHandlersProps {
  selectedClip: Clip | null;
  updateClip: (id: string, updates: Record<string, string | number | boolean | object>) => void;
  debounced: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    rotation: number;
    scale: number;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    bassGain: number;
    midGain: number;
    trebleGain: number;
    compression: number;
  };
  setters: {
    setBrightness: (val: number) => void;
    setContrast: (val: number) => void;
    setSaturation: (val: number) => void;
    setHue: (val: number) => void;
    setBlur: (val: number) => void;
    setRotation: (val: number) => void;
    setScale: (val: number) => void;
    setVolume: (val: number) => void;
    setFadeIn: (val: number) => void;
    setFadeOut: (val: number) => void;
    setBassGain: (val: number) => void;
    setMidGain: (val: number) => void;
    setTrebleGain: (val: number) => void;
    setCompression: (val: number) => void;
  };
}

/**
 * Custom hook for handling correction updates and resets
 */
export function useCorrectionHandlers({
  selectedClip,
  updateClip,
  debounced,
  setters,
}: CorrectionHandlersProps): { updateTransform: (updates: Partial<Transform>) => void; updateAudioEffects: (updates: Partial<AudioEffects>) => void; resetColorCorrection: () => void; applyVideoEffectsPreset: (effects: VideoEffects) => void; resetTransform: () => void; resetAudioEffects: () => void; } {
  // Apply debounced video effects updates
  useEffect((): void => {
    if (selectedClip) {
      const current = selectedClip.colorCorrection || {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
        blur: 0,
      };
      const currentBlur = (current as { blur?: number }).blur ?? 0;
      if (
        current.brightness !== debounced.brightness ||
        current.contrast !== debounced.contrast ||
        current.saturation !== debounced.saturation ||
        current.hue !== debounced.hue ||
        currentBlur !== debounced.blur
      ) {
        updateClip(selectedClip.id, {
          colorCorrection: {
            brightness: debounced.brightness,
            contrast: debounced.contrast,
            saturation: debounced.saturation,
            hue: debounced.hue,
            blur: debounced.blur,
          },
        });
      }
    }
  }, [
    debounced.brightness,
    debounced.contrast,
    debounced.saturation,
    debounced.hue,
    debounced.blur,
    selectedClip,
    updateClip,
  ]);

  // Apply debounced transform updates
  useEffect((): void => {
    if (selectedClip) {
      const current = selectedClip.transform || {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        scale: 1.0,
      };
      if (current.rotation !== debounced.rotation || current.scale !== debounced.scale) {
        updateClip(selectedClip.id, {
          transform: {
            ...current,
            rotation: debounced.rotation,
            scale: debounced.scale,
          },
        });
      }
    }
  }, [debounced.rotation, debounced.scale, selectedClip, updateClip]);

  // Apply debounced audio effects updates
  useEffect((): void => {
    if (selectedClip && selectedClip.hasAudio) {
      const current = selectedClip.audioEffects || {
        volume: 0,
        mute: false,
        fadeIn: 0,
        fadeOut: 0,
        bassGain: 0,
        midGain: 0,
        trebleGain: 0,
        compression: 0,
        normalize: false,
      };
      if (
        current.volume !== debounced.volume ||
        current.fadeIn !== debounced.fadeIn ||
        current.fadeOut !== debounced.fadeOut ||
        current.bassGain !== debounced.bassGain ||
        current.midGain !== debounced.midGain ||
        current.trebleGain !== debounced.trebleGain ||
        current.compression !== debounced.compression
      ) {
        updateClip(selectedClip.id, {
          audioEffects: {
            ...current,
            volume: debounced.volume,
            fadeIn: debounced.fadeIn,
            fadeOut: debounced.fadeOut,
            bassGain: debounced.bassGain,
            midGain: debounced.midGain,
            trebleGain: debounced.trebleGain,
            compression: debounced.compression,
          },
        });
      }
    }
  }, [
    debounced.volume,
    debounced.fadeIn,
    debounced.fadeOut,
    debounced.bassGain,
    debounced.midGain,
    debounced.trebleGain,
    debounced.compression,
    selectedClip,
    updateClip,
  ]);

  // Handler functions
  const updateTransform = useCallback(
    (updates: Partial<Transform>): void => {
      if (!selectedClip) return;
      const transform = selectedClip.transform || {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        scale: 1.0,
      };
      updateClip(selectedClip.id, {
        transform: { ...transform, ...updates },
      });
    },
    [selectedClip, updateClip]
  );

  const updateAudioEffects = useCallback(
    (updates: Partial<AudioEffects>): void => {
      if (!selectedClip) return;
      const audioEffects = selectedClip.audioEffects || {
        volume: 0,
        mute: false,
        fadeIn: 0,
        fadeOut: 0,
        bassGain: 0,
        midGain: 0,
        trebleGain: 0,
        compression: 0,
        normalize: false,
      };
      updateClip(selectedClip.id, {
        audioEffects: { ...audioEffects, ...updates },
      });
    },
    [selectedClip, updateClip]
  );

  const resetColorCorrection = useCallback((): void => {
    if (!selectedClip) return;
    setters.setBrightness(100);
    setters.setContrast(100);
    setters.setSaturation(100);
    setters.setHue(0);
    setters.setBlur(0);
    updateClip(selectedClip.id, {
      colorCorrection: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0 },
    });
  }, [selectedClip, updateClip, setters]);

  const applyVideoEffectsPreset = useCallback(
    (effects: VideoEffects): void => {
      if (!selectedClip) return;
      setters.setBrightness(effects.brightness);
      setters.setContrast(effects.contrast);
      setters.setSaturation(effects.saturation);
      setters.setHue(effects.hue);
      setters.setBlur(effects.blur);
      updateClip(selectedClip.id, {
        colorCorrection: effects,
      });
    },
    [selectedClip, updateClip, setters]
  );

  const resetTransform = useCallback((): void => {
    if (!selectedClip) return;
    setters.setRotation(0);
    setters.setScale(1.0);
    updateClip(selectedClip.id, {
      transform: { rotation: 0, flipHorizontal: false, flipVertical: false, scale: 1.0 },
    });
  }, [selectedClip, updateClip, setters]);

  const resetAudioEffects = useCallback((): void => {
    if (!selectedClip) return;
    setters.setVolume(0);
    setters.setFadeIn(0);
    setters.setFadeOut(0);
    setters.setBassGain(0);
    setters.setMidGain(0);
    setters.setTrebleGain(0);
    setters.setCompression(0);
    updateClip(selectedClip.id, {
      audioEffects: {
        volume: 0,
        mute: false,
        fadeIn: 0,
        fadeOut: 0,
        bassGain: 0,
        midGain: 0,
        trebleGain: 0,
        compression: 0,
        normalize: false,
      },
    });
  }, [selectedClip, updateClip, setters]);

  return {
    updateTransform,
    updateAudioEffects,
    resetColorCorrection,
    applyVideoEffectsPreset,
    resetTransform,
    resetAudioEffects,
  };
}
