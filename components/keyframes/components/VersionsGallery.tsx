'use client';

/**
 * VersionsGallery - AI-generated keyframe versions gallery
 *
 * Displays a grid gallery of all AI-generated versions for keyframes.
 * Shows version number, generation prompt, and creation timestamp for
 * each generated image.
 *
 * Features:
 * - Responsive grid layout (2-4 columns)
 * - Version thumbnails with lazy loading
 * - Version number badges
 * - Truncated prompt preview with full text on hover
 * - Formatted creation timestamps
 * - Empty state handling
 * - Version count indicator
 *
 * Layout:
 * - Mobile: 2 columns
 * - Tablet: 3 columns
 * - Desktop: 4 columns
 *
 * @param edits - Array of frame edit records with signed URLs
 *
 * @example
 * ```tsx
 * <VersionsGallery edits={generatedVersions} />
 * ```
 */

import Image from 'next/image';

interface FrameEditRow {
  id: string;
  frame_id: string;
  version: number;
  output_storage_path: string;
  created_at: string;
  prompt: string;
}

interface VersionsGalleryProps {
  edits: Array<FrameEditRow & { url: string | null }>;
}

export function VersionsGallery({ edits }: VersionsGalleryProps): React.ReactElement {
  return (
    <div className="bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
          Versions
        </h2>
        <span className="text-[10px] text-neutral-400">{edits.length}</span>
      </div>
      {edits.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {edits.map((edit): React.ReactElement => (
            <div key={edit.id} className="space-y-1.5">
              <div className="relative aspect-[4/3] overflow-hidden rounded border border-neutral-200 bg-neutral-50">
                {edit.url ? (
                  <Image
                    src={edit.url}
                    alt={`Version ${edit.version}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] text-neutral-400">
                    ...
                  </div>
                )}
              </div>
              <p className="text-[10px] font-medium text-neutral-900">v{edit.version}</p>
              <p className="truncate text-[9px] text-neutral-500" title={edit.prompt}>
                {edit.prompt}
              </p>
              <p className="text-[9px] text-neutral-400">
                {new Date(edit.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
          <p className="text-xs text-neutral-500">No edits yet</p>
        </div>
      )}
    </div>
  );
}
