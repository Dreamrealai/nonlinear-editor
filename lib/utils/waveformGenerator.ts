/**
 * Waveform Generator Utility
 *
 * Generates multi-resolution waveform data from audio files for efficient timeline visualization
 *
 * Features:
 * - Multiple LOD (Level of Detail) levels for zoom-aware rendering
 * - Caches waveform data in asset metadata
 * - Efficient downsampling using RMS (Root Mean Square) for accurate amplitude representation
 * - Supports both audio and video files with audio tracks
 */

import { browserLogger } from '@/lib/browserLogger';

export type WaveformData = {
  /** Waveform samples at different detail levels */
  levels: {
    /** Number of samples in this level */
    sampleCount: number;
    /** Normalized amplitude data (0-1 range) */
    samples: number[];
    /** Recommended zoom range for this LOD level */
    minZoom?: number;
    maxZoom?: number;
  }[];
  /** Total duration of the audio in seconds */
  duration: number;
  /** Sample rate of the original audio */
  sampleRate: number;
  /** Number of channels in the audio */
  channels: number;
};

/**
 * LOD levels configuration
 * Each level is optimized for different zoom ranges
 */
const LOD_LEVELS = [
  { sampleCount: 100, minZoom: 0, maxZoom: 50 }, // Very zoomed out (overview)
  { sampleCount: 500, minZoom: 50, maxZoom: 150 }, // Medium zoom
  { sampleCount: 2000, minZoom: 150, maxZoom: Infinity }, // Max zoom (detailed)
];

/**
 * Calculate RMS (Root Mean Square) for a block of samples
 * RMS gives a better representation of perceived loudness than simple averaging
 */
function calculateRMS(samples: Float32Array, start: number, blockSize: number): number {
  let sum = 0;
  const end = Math.min(start + blockSize, samples.length);

  for (let i = start; i < end; i++) {
    const sample = samples[i] ?? 0;
    sum += sample * sample;
  }

  return Math.sqrt(sum / blockSize);
}

/**
 * Downsample audio data to a target sample count using RMS
 */
function downsampleToLevel(
  rawData: Float32Array,
  targetSampleCount: number
): number[] {
  const blockSize = Math.floor(rawData.length / targetSampleCount);
  const samples: number[] = [];

  for (let i = 0; i < targetSampleCount; i++) {
    const start = blockSize * i;
    const rms = calculateRMS(rawData, start, blockSize);
    samples.push(rms);
  }

  // Normalize to 0-1 range
  const max = Math.max(...samples, 0.01); // Prevent division by zero
  return samples.map((s) => s / max);
}

/**
 * Generate multi-resolution waveform data from an audio file URL
 *
 * @param audioUrl - URL to the audio/video file
 * @returns Promise resolving to WaveformData with multiple LOD levels
 */
export async function generateWaveformData(audioUrl: string): Promise<WaveformData> {
  try {
    // Fetch audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Create audio context
    const audioContext = new (window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      await audioContext.close();
      throw error;
    }

    // Get audio data from first channel (mono or left channel)
    const rawData = audioBuffer.getChannelData(0);

    // Generate multiple LOD levels
    const levels = LOD_LEVELS.map((config) => ({
      sampleCount: config.sampleCount,
      samples: downsampleToLevel(rawData, config.sampleCount),
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
    }));

    const waveformData: WaveformData = {
      levels,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };

    // Clean up
    await audioContext.close();

    return waveformData;
  } catch (error) {
    browserLogger.error({ error, audioUrl }, 'Failed to generate waveform data');
    throw error;
  }
}

/**
 * Select the appropriate LOD level based on current zoom
 *
 * @param waveformData - Multi-resolution waveform data
 * @param zoom - Current timeline zoom (pixels per second)
 * @returns The most appropriate LOD level for the current zoom
 */
export function selectLODLevel(
  waveformData: WaveformData,
  zoom: number
): WaveformData['levels'][0] {
  // Find the level that best matches the current zoom
  for (const level of waveformData.levels) {
    if (
      (level.minZoom === undefined || zoom >= level.minZoom) &&
      (level.maxZoom === undefined || zoom < level.maxZoom)
    ) {
      return level;
    }
  }

  // Fallback to highest detail level
  return waveformData.levels[waveformData.levels.length - 1]!;
}

/**
 * Serialize waveform data for storage in asset metadata
 */
export function serializeWaveformData(waveformData: WaveformData): string {
  return JSON.stringify(waveformData);
}

/**
 * Deserialize waveform data from asset metadata
 */
export function deserializeWaveformData(serialized: string): WaveformData {
  return JSON.parse(serialized) as WaveformData;
}
