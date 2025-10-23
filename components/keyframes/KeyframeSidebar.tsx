/* eslint-disable @next/next/no-img-element */
'use client';

import clsx from 'clsx';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { SceneRow, SceneFrameRow } from './hooks/useFramesData';

interface KeyframeSidebarProps {
  scenes: SceneRow[];
  frames: SceneFrameRow[];
  frameUrls: Record<string, string>;
  selectedFrameId: string | null;
  groupedFrames: Map<string, SceneFrameRow[]>;
  onFrameSelect: (frame: SceneFrameRow) => void;
  onExtractFrame: () => void;
  onUploadImage: () => void;
  isUploadingImage: boolean;
  hasAssetVideoUrl: boolean;
  selectedAssetId: string | null;
}

const formatMs = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export function KeyframeSidebar({
  scenes,
  frames,
  frameUrls,
  selectedFrameId,
  groupedFrames,
  onFrameSelect,
  onExtractFrame,
  onUploadImage,
  isUploadingImage,
  hasAssetVideoUrl,
  selectedAssetId,
}: KeyframeSidebarProps) {
  const customFrames = frames.filter((f) => f.kind === 'custom');

  return (
    <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-neutral-200 bg-white">
      {/* Action Buttons */}
      <div className="space-y-2 border-b border-neutral-200 p-4">
        <button
          type="button"
          className="w-full rounded bg-neutral-900 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onExtractFrame}
          disabled={!hasAssetVideoUrl}
        >
          Extract Frame
        </button>
        <button
          type="button"
          className="w-full rounded border border-neutral-200 bg-white py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onUploadImage}
          disabled={isUploadingImage || !selectedAssetId}
        >
          {isUploadingImage ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>

      {/* Custom Frames Section */}
      {customFrames.length > 0 && (
        <div className="border-b border-neutral-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Custom
            </h2>
            <span className="text-[10px] text-neutral-400">{customFrames.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {customFrames
              .sort((a, b) => b.t_ms - a.t_ms)
              .map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => onFrameSelect(frame)}
                  className={clsx(
                    'group relative aspect-[4/3] overflow-hidden rounded border text-left transition-all',
                    selectedFrameId === frame.id
                      ? 'border-neutral-900 ring-1 ring-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-400'
                  )}
                >
                  {frameUrls[frame.id] ? (
                    <img
                      src={frameUrls[frame.id] ?? ''}
                      alt="Custom frame"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-neutral-100">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                    <span className="text-[9px] font-medium text-white">
                      {frame.t_ms > 0 ? formatMs(frame.t_ms) : 'Upload'}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Scene Frames Section */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Scenes
          </h2>
          <span className="text-[10px] text-neutral-400">{scenes.length}</span>
        </div>
        <div className="space-y-3">
          {scenes.map((scene) => {
            const sceneFrames = groupedFrames.get(scene.id) ?? [];
            return (
              <div key={scene.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-neutral-500">
                  <span>{formatMs(scene.start_ms)}</span>
                  <span className="text-neutral-300">—</span>
                  <span>{formatMs(scene.end_ms)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {sceneFrames.map((frame) => (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => onFrameSelect(frame)}
                      className={clsx(
                        'group relative aspect-[4/3] overflow-hidden rounded border text-left transition-all',
                        selectedFrameId === frame.id
                          ? 'border-neutral-900 ring-1 ring-neutral-900'
                          : 'border-neutral-200 hover:border-neutral-400'
                      )}
                    >
                      {frameUrls[frame.id] ? (
                        <img
                          src={frameUrls[frame.id] ?? ''}
                          alt={`${frame.kind} frame`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-neutral-100 text-[9px] text-neutral-400">
                          ...
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
                        <span className="text-[8px] font-medium uppercase text-white">
                          {frame.kind}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!scenes.length && (
            <div className="rounded border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <svg
                className="mx-auto h-8 w-8 text-neutral-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              <p className="mt-2 text-xs text-neutral-600">No scenes detected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
