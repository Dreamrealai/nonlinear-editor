'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Clip } from '@/types/timeline';
import { browserLogger } from '@/lib/browserLogger';

type AudioWaveformProps = {
  clip: Clip;
  width: number;
  height: number;
  className?: string;
};

/**
 * AudioWaveform Component
 *
 * Renders a visual waveform representation of audio data from a video or audio clip.
 * Uses Web Audio API to extract amplitude data and renders it on a canvas.
 *
 * Features:
 * - Extracts audio data using AudioContext
 * - Downsamples to match timeline width
 * - Renders as vertical bars representing amplitude
 * - Caches waveform data for performance
 */
export const AudioWaveform = React.memo<AudioWaveformProps>(function AudioWaveform({
  clip,
  width,
  height,
  className = '',
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract audio waveform data
  useEffect(() => {
    if (!clip.hasAudio || !clip.previewUrl) {
      setWaveformData(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const extractWaveform = async () => {
      try {
        // Fetch audio file
        const response = await fetch(clip.previewUrl!);
        const arrayBuffer = await response.arrayBuffer();

        // Create audio context
        const audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        if (isCancelled) {
          audioContext.close();
          return;
        }

        // Get audio data from first channel
        const rawData = audioBuffer.getChannelData(0);

        // Downsample to match canvas width (one sample per pixel)
        const samples = Math.min(width * 2, 1000); // Cap at 1000 samples for performance
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
          const start = blockSize * i;
          let sum = 0;

          // Average the block for this sample
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[start + j] ?? 0);
          }

          filteredData[i] = sum / blockSize;
        }

        if (!isCancelled) {
          setWaveformData(filteredData);
        }

        audioContext.close();
      } catch (error) {
        browserLogger.error({ error, clipId: clip.id }, 'Failed to extract waveform');
        setWaveformData(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    extractWaveform();

    return () => {
      isCancelled = true;
    };
  }, [clip.id, clip.previewUrl, clip.hasAudio, width]);

  // Render waveform on canvas
  useEffect(() => {
    if (!waveformData || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    const barWidth = width / waveformData.length;
    const middleY = height / 2;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'; // Blue with transparency

    for (let i = 0; i < waveformData.length; i++) {
      const amplitude = waveformData[i] ?? 0;
      const barHeight = amplitude * height * 0.8; // Scale to 80% of height
      const barX = i * barWidth;
      const barY = middleY - barHeight / 2;

      ctx.fillRect(barX, barY, Math.max(1, barWidth - 0.5), barHeight);
    }
  }, [waveformData, width, height]);

  if (!clip.hasAudio) {
    return null;
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20">
          <div className="text-xs text-gray-400">Loading waveform...</div>
        </div>
      )}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width, height }} />
    </div>
  );
});
