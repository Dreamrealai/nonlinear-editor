/**
 * useAudioEffects Hook
 *
 * Manages Web Audio API nodes for applying real-time audio effects to video elements.
 * Supports:
 * - Volume adjustment (-60dB to +12dB)
 * - 3-band EQ (bass, mid, treble)
 * - Dynamic range compression
 * - Fade in/out
 * - Mute
 *
 * This hook creates an audio processing chain:
 * MediaElementSource → Gain → EQ (3-band) → Compressor → Destination
 */

import { useEffect, useRef, useCallback } from 'react';
import type { AudioEffects } from '@/types/timeline';
import { browserLogger } from '@/lib/browserLogger';

interface AudioNode {
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
  bassFilter: BiquadFilterNode;
  midFilter: BiquadFilterNode;
  trebleFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
}

/**
 * Converts decibels to linear gain value
 * @param db - Decibel value
 * @returns Linear gain (0-1+ range)
 */
function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export interface UseAudioEffectsReturn {
  connectAudio: (clipId: string, videoElement: HTMLVideoElement) => AudioNode | null;
  applyEffects: (
    clipId: string,
    effects: AudioEffects | undefined,
    clipProgress: number,
    clipDuration: number
  ) => void;
  disconnectAudio: (clipId: string) => void;
}

/**
 * Custom hook for managing audio effects using Web Audio API.
 *
 * Creates and manages an audio processing chain for each video element.
 * The chain includes gain, EQ filters, and compression nodes.
 */
export function useAudioEffects(): UseAudioEffectsReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<Map<string, AudioNode>>(new Map());

  /**
   * Get or create the AudioContext (singleton pattern)
   */
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as never)['webkitAudioContext'];
      audioContextRef.current = new AudioContextClass();

      browserLogger.info(
        { sampleRate: audioContextRef.current.sampleRate },
        'Audio context created for effects processing'
      );
    }
    return audioContextRef.current;
  }, []);

  /**
   * Connect a video element to the Web Audio API processing chain.
   * Creates all necessary audio nodes and connects them.
   *
   * @param clipId - Unique identifier for the clip
   * @param videoElement - HTML video element to process
   * @returns Audio processing nodes or null if setup fails
   */
  const connectAudio = useCallback(
    (clipId: string, videoElement: HTMLVideoElement): AudioNode | null => {
      try {
        // Check if already connected
        if (audioNodesRef.current.has(clipId)) {
          return audioNodesRef.current.get(clipId) ?? null;
        }

        const ctx = getAudioContext();

        // Create source from video element
        const source = ctx.createMediaElementSource(videoElement);

        // Create gain node for volume control
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0; // 0 dB (unity gain)

        // Create 3-band EQ using biquad filters
        // Bass: Low-shelf filter at 200Hz
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 200;
        bassFilter.gain.value = 0;

        // Mid: Peaking filter at 1000Hz with Q=1
        const midFilter = ctx.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 1;
        midFilter.gain.value = 0;

        // Treble: High-shelf filter at 4000Hz
        const trebleFilter = ctx.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 4000;
        trebleFilter.gain.value = 0;

        // Create compressor for dynamic range compression
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 1; // 1:1 = no compression initially
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        // Connect the audio graph:
        // source → gain → bass → mid → treble → compressor → destination
        source.connect(gainNode);
        gainNode.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(compressor);
        compressor.connect(ctx.destination);

        const audioNode: AudioNode = {
          source,
          gainNode,
          bassFilter,
          midFilter,
          trebleFilter,
          compressor,
        };

        audioNodesRef.current.set(clipId, audioNode);

        browserLogger.info({ clipId }, 'Audio effects chain connected');

        return audioNode;
      } catch (error) {
        browserLogger.error({ clipId, error }, 'Failed to connect audio effects chain');
        return null;
      }
    },
    [getAudioContext]
  );

  /**
   * Apply audio effects to a connected video element.
   * Updates all audio nodes based on the provided effects settings.
   *
   * @param clipId - Unique identifier for the clip
   * @param effects - Audio effects settings
   * @param clipProgress - Progress through the clip (0-1) for fade calculation
   * @param clipDuration - Total duration of the clip in seconds
   */
  const applyEffects = useCallback(
    (
      clipId: string,
      effects: AudioEffects | undefined,
      clipProgress: number,
      clipDuration: number
    ): void => {
      const audioNode = audioNodesRef.current.get(clipId);
      if (!audioNode) {
        return;
      }

      const ctx = getAudioContext();
      const currentTime = ctx.currentTime;

      // Default effects if not provided
      const effectsWithDefaults: AudioEffects = {
        volume: effects?.volume ?? 0,
        mute: effects?.mute ?? false,
        fadeIn: effects?.fadeIn ?? 0,
        fadeOut: effects?.fadeOut ?? 0,
        bassGain: effects?.bassGain ?? 0,
        midGain: effects?.midGain ?? 0,
        trebleGain: effects?.trebleGain ?? 0,
        compression: effects?.compression ?? 0,
        normalize: effects?.normalize ?? false,
      };

      // 1. Calculate volume with fades
      let volumeGain = effectsWithDefaults.mute ? 0 : dbToGain(effectsWithDefaults.volume);

      // Apply fade in
      if (effectsWithDefaults.fadeIn > 0 && clipProgress < effectsWithDefaults.fadeIn) {
        const fadeInProgress = clipProgress / effectsWithDefaults.fadeIn;
        volumeGain *= fadeInProgress;
      }

      // Apply fade out
      if (effectsWithDefaults.fadeOut > 0) {
        const fadeOutStart = clipDuration - effectsWithDefaults.fadeOut;
        if (clipProgress > fadeOutStart) {
          const fadeOutProgress = (clipDuration - clipProgress) / effectsWithDefaults.fadeOut;
          volumeGain *= fadeOutProgress;
        }
      }

      // Apply volume (with smooth ramp to avoid clicks)
      audioNode.gainNode.gain.setTargetAtTime(volumeGain, currentTime, 0.01);

      // 2. Apply EQ (bass, mid, treble)
      audioNode.bassFilter.gain.setTargetAtTime(effectsWithDefaults.bassGain, currentTime, 0.01);
      audioNode.midFilter.gain.setTargetAtTime(effectsWithDefaults.midGain, currentTime, 0.01);
      audioNode.trebleFilter.gain.setTargetAtTime(
        effectsWithDefaults.trebleGain,
        currentTime,
        0.01
      );

      // 3. Apply compression
      // Map 0-100 to compression ratio 1:1 to 20:1
      const compressionRatio = 1 + (effectsWithDefaults.compression / 100) * 19;
      audioNode.compressor.ratio.setTargetAtTime(compressionRatio, currentTime, 0.01);

      // 4. Normalize (adjust threshold for auto-gain)
      if (effectsWithDefaults.normalize) {
        // When normalize is enabled, adjust compressor threshold to target -3dB peak
        audioNode.compressor.threshold.value = -18;
      } else {
        audioNode.compressor.threshold.value = -24;
      }
    },
    [getAudioContext]
  );

  /**
   * Disconnect and clean up audio nodes for a clip.
   *
   * @param clipId - Unique identifier for the clip
   */
  const disconnectAudio = useCallback((clipId: string): void => {
    const audioNode = audioNodesRef.current.get(clipId);
    if (!audioNode) {
      return;
    }

    try {
      // Disconnect all nodes
      audioNode.source.disconnect();
      audioNode.gainNode.disconnect();
      audioNode.bassFilter.disconnect();
      audioNode.midFilter.disconnect();
      audioNode.trebleFilter.disconnect();
      audioNode.compressor.disconnect();

      audioNodesRef.current.delete(clipId);

      browserLogger.info({ clipId }, 'Audio effects chain disconnected');
    } catch (error) {
      browserLogger.error({ clipId, error }, 'Failed to disconnect audio effects chain');
    }
  }, []);

  /**
   * Clean up all audio resources on unmount
   */
  useEffect((): (() => void) => {
    return (): void => {
      // Disconnect all audio nodes
      audioNodesRef.current.forEach((_, clipId): void => {
        disconnectAudio(clipId);
      });

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch((error): void => {
          browserLogger.error({ error }, 'Failed to close audio context');
        });
        audioContextRef.current = null;
      }
    };
  }, [disconnectAudio]);

  return {
    connectAudio,
    applyEffects,
    disconnectAudio,
  };
}
