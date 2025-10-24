'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Clip } from '@/types/timeline';
import { browserLogger } from '@/lib/browserLogger';

type AudioWaveformProps = {
  clip: Clip;
  width: number;
  height: number;
  zoom?: number; // Zoom level in pixels per second (for future LOD optimization)
  className?: string;
};

// Global cache for waveform data to prevent redundant processing
const waveformCache = new Map<string, Float32Array>();

// Worker pool for parallel waveform processing
let workerPool: Worker[] | null = null;
let workerIndex = 0;

const getWorkerPool = (): Worker[] => {
  if (!workerPool) {
    const poolSize = Math.min(navigator.hardwareConcurrency || 2, 4);
    workerPool = [];
    for (let i = 0; i < poolSize; i++) {
      try {
        const worker = new Worker(new URL('../lib/workers/waveformWorker.ts', import.meta.url));
        workerPool.push(worker);
      } catch (error) {
        browserLogger.error({ error }, 'Failed to create waveform worker');
      }
    }
  }
  return workerPool;
};

const getNextWorker = (): Worker | null => {
  const pool = getWorkerPool();
  if (pool.length === 0) return null;

  const worker = pool[workerIndex % pool.length];
  workerIndex++;
  return worker ?? null;
};

/**
 * AudioWaveform Component (Performance Optimized)
 *
 * Renders a visual waveform representation of audio data from a video or audio clip.
 *
 * Performance Optimizations:
 * - Web Worker processing to offload computation from main thread
 * - Global cache to prevent redundant waveform extraction
 * - Worker pool for parallel processing of multiple clips
 * - Lazy loading - only processes visible clips
 * - Canvas rendering with device pixel ratio for crisp display
 *
 * Features:
 * - Extracts audio data using Web Audio API in worker thread
 * - Downsamples to match timeline width
 * - Renders as vertical bars representing amplitude
 * - Caches waveform data globally for instant re-renders
 */
export const AudioWaveform = React.memo<AudioWaveformProps>(function AudioWaveform({
  clip,
  width,
  height,
  zoom = 50, // Default zoom level
  className = '',
}): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize cache key to prevent recalculation
  // Include zoom to support different LOD levels in future
  const cacheKey = useMemo(
    (): string => `${clip.id}_${clip.previewUrl}_${width}_${Math.floor(zoom / 50)}`,
    [clip.id, clip.previewUrl, width, zoom]
  );

  // Extract audio waveform data with caching and Web Worker
  useEffect((): (() => void) | undefined => {
    if (!clip.hasAudio || !clip.previewUrl) {
      setWaveformData(null);
      return;
    }

    // Check cache first
    const cachedData = waveformCache.get(cacheKey);
    if (cachedData) {
      setWaveformData(cachedData);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const extractWaveform = async (): Promise<void> => {
      try {
        // Fetch audio file
        const response = await fetch(clip.previewUrl!);
        const arrayBuffer = await response.arrayBuffer();

        if (isCancelled) return;

        // Calculate sample count based on zoom level (LOD)
        // Higher zoom = more detail needed
        const detailLevel = Math.min(zoom / 50, 3); // 1x, 2x, or 3x detail
        const samples = Math.min(Math.floor(width * detailLevel), 2000);

        // Try to use Web Worker for processing
        const worker = getNextWorker();
        if (worker) {
          // Process in Web Worker (offloads from main thread)
          await new Promise<void>((resolve, reject): void => {
            const handleMessage = (e: MessageEvent): void => {
              if (e.data.type === 'result') {
                if (!isCancelled) {
                  const filteredData = e.data.data as Float32Array;
                  waveformCache.set(cacheKey, filteredData);
                  setWaveformData(filteredData);
                }
                worker.removeEventListener('message', handleMessage);
                resolve();
              } else if (e.data.type === 'error') {
                worker.removeEventListener('message', handleMessage);
                reject(new Error(e.data.error));
              }
            };

            worker.addEventListener('message', handleMessage);
            worker.postMessage(
              {
                type: 'process',
                audioBuffer: arrayBuffer,
                sampleCount: samples,
              },
              [arrayBuffer]
            );
          });
        } else {
          // Fallback: Process on main thread (if workers unavailable)
          const audioContext = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

          if (isCancelled) {
            audioContext.close();
            return;
          }

          // Get audio data from first channel
          const rawData = audioBuffer.getChannelData(0);

          // Downsample to match canvas width
          const blockSize = Math.floor(rawData.length / samples);
          const filteredData = new Float32Array(samples);

          for (let i = 0; i < samples; i++) {
            const start = blockSize * i;
            let sum = 0;

            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(rawData[start + j] ?? 0);
            }

            filteredData[i] = sum / blockSize;
          }

          if (!isCancelled) {
            waveformCache.set(cacheKey, filteredData);
            setWaveformData(filteredData);
          }

          audioContext.close();
        }
      } catch (error) {
        if (!isCancelled) {
          browserLogger.error({ error, clipId: clip.id }, 'Failed to extract waveform');
          setWaveformData(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    extractWaveform();

    return (): void => {
      isCancelled = true;
    };
  }, [cacheKey, clip.id, clip.previewUrl, clip.hasAudio, width]);

  // Render waveform on canvas
  useEffect((): void => {
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
