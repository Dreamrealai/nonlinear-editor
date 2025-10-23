/**
 * AssetPanel Component
 *
 * Displays and manages assets (videos, images, audio) for a project.
 * Provides upload, delete, and organization functionality with tabbed interface.
 */
'use client';

import { type ChangeEvent, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Metadata associated with media assets.
 */
export type AssetMetadata = {
  filename?: string;
  mimeType?: string;
  thumbnail?: string;
  sourceUrl?: string;
  durationSeconds?: number | null;
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
};

/**
 * Represents a media asset stored in the database.
 */
export type AssetRow = {
  id: string;
  storage_url: string;
  duration_seconds: number | null;
  metadata: AssetMetadata | null;
  rawMetadata: Record<string, unknown> | null;
  created_at: string | null;
  type: 'video' | 'audio' | 'image';
};

interface AssetPanelProps {
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
}

/**
 * Extracts the file name from a storage URL.
 */
const extractFileName = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
};

export default function AssetPanel({
  assets,
  projectId,
  loadingAssets,
  assetError,
  uploadPending,
  activeTab,
  onTabChange,
  onFileSelect,
  onAssetAdd,
  onAssetDelete,
}: AssetPanelProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter((a) =>
    activeTab === 'video' ? a.type === 'video' :
    activeTab === 'image' ? a.type === 'image' :
    a.type === 'audio'
  );

  return (
    <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">Assets</h2>
        <div className="flex items-center gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept={activeTab === 'video' ? 'video/*' : activeTab === 'image' ? 'image/*' : 'audio/*'}
            className="hidden"
            onChange={onFileSelect}
          />
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadPending}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {uploadPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => onTabChange('video')}
          className={`px-3 py-2 text-xs font-medium transition ${
            activeTab === 'video'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Video
        </button>
        <button
          type="button"
          onClick={() => onTabChange('image')}
          className={`px-3 py-2 text-xs font-medium transition ${
            activeTab === 'image'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Images
        </button>
        <button
          type="button"
          onClick={() => onTabChange('audio')}
          className={`px-3 py-2 text-xs font-medium transition ${
            activeTab === 'audio'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Audio
        </button>
      </div>

      {/* Video Tab Buttons */}
      {activeTab === 'video' && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadPending}
            className="group w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploadPending ? 'Uploading…' : 'Upload Video/Image'}
            </div>
          </button>
          <Link
            href={`/video-gen?projectId=${projectId}`}
            className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Generate Video with AI
            </div>
          </Link>
        </div>
      )}

      {/* Images Tab Buttons */}
      {activeTab === 'image' && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadPending}
            className="group w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploadPending ? 'Uploading…' : 'Upload Images'}
            </div>
          </button>
          <Link
            href={`/image-gen?projectId=${projectId}`}
            className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Generate Images with AI
            </div>
          </Link>
        </div>
      )}

      {/* Audio Tab Buttons */}
      {activeTab === 'audio' && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadPending}
            className="group w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-75"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploadPending ? 'Uploading…' : 'Upload Audio'}
            </div>
          </button>
          <Link
            href={`/audio-gen?projectId=${projectId}`}
            className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Generate Audio with AI
            </div>
          </Link>
        </div>
      )}

      {assetError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {assetError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {loadingAssets && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Loading assets…
          </div>
        )}
        {!loadingAssets && filteredAssets.length === 0 && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            {activeTab === 'video' ? 'No video assets yet. Upload video to begin editing.' : activeTab === 'image' ? 'No image assets yet. Upload images.' : 'No audio assets yet. Upload or generate audio.'}
          </div>
        )}
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="group relative flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void onAssetAdd(asset)}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-neutral-50 px-3 py-2 text-left transition hover:border-neutral-200 hover:bg-white"
            >
              {asset.metadata?.thumbnail ? (
                <Image
                  src={asset.metadata.thumbnail}
                  alt=""
                  width={112}
                  height={64}
                  className="h-16 w-28 rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-28 items-center justify-center rounded-md bg-neutral-200 text-xs text-neutral-600">
                  {asset.type.toUpperCase()}
                </div>
              )}
              <div className="flex-1 text-xs">
                <p className="font-medium text-neutral-900">
                  {asset.metadata?.filename ?? extractFileName(asset.storage_url)}
                </p>
                <p className="text-neutral-500">
                  {asset.metadata?.mimeType ??
                   asset.metadata?.format ??
                   (asset.metadata?.videoCodec ? `${asset.metadata.videoCodec}/${asset.metadata.audioCodec ?? 'no audio'}` : null) ??
                   `${asset.type} file`}
                </p>
              </div>
            </button>

            {/* Delete button - always visible */}
            <button
              onClick={() => void onAssetDelete(asset)}
              className="absolute right-2 top-2 z-10 rounded-md bg-red-500 p-1.5 text-white shadow-lg transition-all hover:bg-red-600"
              title="Delete asset"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
