/**
 * ResizableAssetPanel Component
 *
 * Wraps the AssetPanel with resize functionality.
 * Provides a prominent resize handle that users can drag to adjust panel width.
 */
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AssetPanel } from './AssetPanel';
import type { AssetRow } from '@/types/assets';
import type { ChangeEvent } from 'react';

interface ResizableAssetPanelProps {
  /** List of all assets */
  assets: AssetRow[];
  /** ID of the current project */
  projectId: string;
  /** Whether assets are currently loading */
  loadingAssets: boolean;
  /** Error message if asset loading failed */
  assetError: string | null;
  /** Whether an upload is in progress */
  uploadPending: boolean;
  /** Current active tab */
  activeTab: 'video' | 'audio' | 'image';
  /** Callback when tab changes */
  onTabChange: (tab: 'video' | 'audio' | 'image') => void;
  /** Callback when file is selected for upload */
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Callback when asset is clicked to add to timeline */
  onAssetAdd: (asset: AssetRow) => Promise<void>;
  /** Callback when asset delete is requested */
  onAssetDelete: (asset: AssetRow) => Promise<void>;
  /** Current page number (0-indexed) */
  currentPage?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Total number of assets */
  totalCount?: number;
  /** Whether there is a next page */
  hasNextPage?: boolean;
  /** Whether there is a previous page */
  hasPreviousPage?: boolean;
  /** Load next page */
  onNextPage?: () => Promise<void>;
  /** Load previous page */
  onPreviousPage?: () => Promise<void>;
  /** Set of asset IDs that are currently used in the timeline */
  usedAssetIds?: Set<string>;
  /** Initial width in pixels */
  initialWidth?: number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
}

export function ResizableAssetPanel({
  initialWidth = 280,
  minWidth = 200,
  maxWidth = 500,
  ...assetPanelProps
}: ResizableAssetPanelProps): React.ReactElement {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(initialWidth);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent): void => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!isResizing) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.min(Math.max(startWidthRef.current + deltaX, minWidth), maxWidth);
      setWidth(newWidth);
    },
    [isResizing, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback((): void => {
    setIsResizing(false);
  }, []);

  useEffect((): (() => void) | undefined => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';

      return (): void => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
    return undefined;
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div ref={panelRef} className="relative flex-shrink-0" style={{ width: `${width}px` }}>
      <AssetPanel {...assetPanelProps} />

      {/* Resize Handle */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize transition-all
          ${isResizing ? 'bg-blue-500 w-2' : isHovering ? 'bg-neutral-400 hover:bg-blue-400' : 'bg-neutral-300'}
        `}
        onMouseDown={handleMouseDown}
        onMouseEnter={(): void => setIsHovering(true)}
        onMouseLeave={(): void => setIsHovering(false)}
        style={{
          // Add a larger invisible hit area for easier grabbing
          boxShadow: isHovering || isResizing ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
        }}
        aria-label="Resize asset panel"
      >
        {/* Grip pattern for visual feedback */}
        <div
          className={`
          absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1
          transition-opacity ${isHovering || isResizing ? 'opacity-100' : 'opacity-0'}
        `}
        >
          <div className="w-0.5 h-1 bg-white rounded-full" />
          <div className="w-0.5 h-1 bg-white rounded-full" />
          <div className="w-0.5 h-1 bg-white rounded-full" />
          <div className="w-0.5 h-1 bg-white rounded-full" />
          <div className="w-0.5 h-1 bg-white rounded-full" />
        </div>
      </div>

      {/* Wider invisible hit area for easier interaction */}
      <div
        role="separator"
        aria-hidden="true"
        className="absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize"
        onMouseDown={handleMouseDown}
        onMouseEnter={(): void => setIsHovering(true)}
        onMouseLeave={(): void => setIsHovering(false)}
      />
    </div>
  );
}
