import { useEffect, useState } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Clip } from '@/types/timeline';

/**
 * Custom hook to manage local state and debounced updates for corrections
 */
export function useCorrectionSync(selectedClip: Clip | null) {
  // Local state for immediate feedback
  const [localBrightness, setLocalBrightness] = useState(100);
  const [localContrast, setLocalContrast] = useState(100);
  const [localSaturation, setLocalSaturation] = useState(100);
  const [localHue, setLocalHue] = useState(0);
  const [localBlur, setLocalBlur] = useState(0);
  const [localRotation, setLocalRotation] = useState(0);
  const [localScale, setLocalScale] = useState(1.0);
  const [localVolume, setLocalVolume] = useState(0);
  const [localFadeIn, setLocalFadeIn] = useState(0);
  const [localFadeOut, setLocalFadeOut] = useState(0);
  const [localBassGain, setLocalBassGain] = useState(0);
  const [localMidGain, setLocalMidGain] = useState(0);
  const [localTrebleGain, setLocalTrebleGain] = useState(0);
  const [localCompression, setLocalCompression] = useState(0);

  // Debounced values for store updates
  const debouncedBrightness = useDebounce(localBrightness, 100);
  const debouncedContrast = useDebounce(localContrast, 100);
  const debouncedSaturation = useDebounce(localSaturation, 100);
  const debouncedHue = useDebounce(localHue, 100);
  const debouncedBlur = useDebounce(localBlur, 100);
  const debouncedRotation = useDebounce(localRotation, 100);
  const debouncedScale = useDebounce(localScale, 100);
  const debouncedVolume = useDebounce(localVolume, 100);
  const debouncedFadeIn = useDebounce(localFadeIn, 100);
  const debouncedFadeOut = useDebounce(localFadeOut, 100);
  const debouncedBassGain = useDebounce(localBassGain, 100);
  const debouncedMidGain = useDebounce(localMidGain, 100);
  const debouncedTrebleGain = useDebounce(localTrebleGain, 100);
  const debouncedCompression = useDebounce(localCompression, 100);

  // Sync local state with selected clip
  useEffect((): void => {
    if (selectedClip) {
      const colorCorrection = selectedClip.colorCorrection || {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
        blur: 0,
      };
      const transform = selectedClip.transform || {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        scale: 1.0,
      };
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

      setLocalBrightness(colorCorrection.brightness);
      setLocalContrast(colorCorrection.contrast);
      setLocalSaturation(colorCorrection.saturation);
      setLocalHue(colorCorrection.hue);
      setLocalBlur((colorCorrection as { blur?: number }).blur ?? 0);
      setLocalRotation(transform.rotation);
      setLocalScale(transform.scale);
      setLocalVolume(audioEffects.volume);
      setLocalFadeIn(audioEffects.fadeIn);
      setLocalFadeOut(audioEffects.fadeOut);
      setLocalBassGain(audioEffects.bassGain);
      setLocalMidGain(audioEffects.midGain);
      setLocalTrebleGain(audioEffects.trebleGain);
      setLocalCompression(audioEffects.compression);
    }
  }, [selectedClip]);

  return {
    // Local state
    local: {
      brightness: localBrightness,
      contrast: localContrast,
      saturation: localSaturation,
      hue: localHue,
      blur: localBlur,
      rotation: localRotation,
      scale: localScale,
      volume: localVolume,
      fadeIn: localFadeIn,
      fadeOut: localFadeOut,
      bassGain: localBassGain,
      midGain: localMidGain,
      trebleGain: localTrebleGain,
      compression: localCompression,
    },
    // Setters
    setters: {
      setBrightness: setLocalBrightness,
      setContrast: setLocalContrast,
      setSaturation: setLocalSaturation,
      setHue: setLocalHue,
      setBlur: setLocalBlur,
      setRotation: setLocalRotation,
      setScale: setLocalScale,
      setVolume: setLocalVolume,
      setFadeIn: setLocalFadeIn,
      setFadeOut: setLocalFadeOut,
      setBassGain: setLocalBassGain,
      setMidGain: setLocalMidGain,
      setTrebleGain: setLocalTrebleGain,
      setCompression: setLocalCompression,
    },
    // Debounced values
    debounced: {
      brightness: debouncedBrightness,
      contrast: debouncedContrast,
      saturation: debouncedSaturation,
      hue: debouncedHue,
      blur: debouncedBlur,
      rotation: debouncedRotation,
      scale: debouncedScale,
      volume: debouncedVolume,
      fadeIn: debouncedFadeIn,
      fadeOut: debouncedFadeOut,
      bassGain: debouncedBassGain,
      midGain: debouncedMidGain,
      trebleGain: debouncedTrebleGain,
      compression: debouncedCompression,
    },
  };
}
