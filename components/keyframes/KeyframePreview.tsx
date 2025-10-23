/* eslint-disable @next/next/no-img-element */
'use client';

import type { CSSProperties } from 'react';
import type { SceneRow, SceneFrameRow } from './hooks/useFramesData';

interface KeyframePreviewProps {
  selectedFrame: SceneFrameRow | null;
  selectedFrameUrl: string | null;
  scenes: SceneRow[];
  mode: 'global' | 'crop';
  cropOverlayStyle?: CSSProperties;
  onImageClick: (event: React.MouseEvent<HTMLImageElement>) => void;
}

export function KeyframePreview({
  selectedFrame,
  selectedFrameUrl,
  scenes,
  mode,
  cropOverlayStyle,
  onImageClick,
}: KeyframePreviewProps) {
  return (
    <div className="border-b border-neutral-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Preview</h2>
        {selectedFrame && (
          <span className="text-[10px] text-neutral-400">
            {selectedFrame.kind === 'custom'
              ? 'Custom'
              : `Scene ${scenes.findIndex((s) => s.id === selectedFrame.scene_id) + 1} · ${selectedFrame.kind}`}
          </span>
        )}
      </div>
      {selectedFrame && selectedFrameUrl ? (
        <div className="relative overflow-hidden rounded border border-neutral-200 bg-neutral-50">
          <img
            src={selectedFrameUrl}
            alt="Selected frame"
            className="w-full"
            onClick={onImageClick}
          />
          {mode === 'crop' && cropOverlayStyle && (
            <div
              className="absolute border-2 border-neutral-900/50 bg-neutral-900/10"
              style={cropOverlayStyle}
            />
          )}
        </div>
      ) : (
        <div className="rounded border border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-neutral-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-3 text-xs text-neutral-500">Select a frame</p>
          <p className="mt-1 text-[10px] text-neutral-400">or paste an image (Cmd/Ctrl+V)</p>
        </div>
      )}
    </div>
  );
}
