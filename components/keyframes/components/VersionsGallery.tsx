/* eslint-disable @next/next/no-img-element */
'use client';

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

export function VersionsGallery({ edits }: VersionsGalleryProps) {
  return (
    <div className="bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Versions</h2>
        <span className="text-[10px] text-neutral-400">{edits.length}</span>
      </div>
      {edits.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {edits.map((edit) => (
            <div key={edit.id} className="space-y-1.5">
              <div className="aspect-[4/3] overflow-hidden rounded border border-neutral-200 bg-neutral-50">
                {edit.url ? (
                  <img src={edit.url} alt={`Version ${edit.version}`} className="h-full w-full object-cover" />
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
