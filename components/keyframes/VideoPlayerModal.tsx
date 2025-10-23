'use client';

interface VideoPlayerModalProps {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  isVideoReady: boolean;
  isExtracting: boolean;
  onClose: () => void;
  onExtract: () => void;
}

export function VideoPlayerModal({
  videoUrl,
  videoRef,
  isVideoReady,
  isExtracting,
  onClose,
  onExtract,
}: VideoPlayerModalProps) {
  return (
    <div className="border-b border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-neutral-700">Video Scrubber</h3>
        <button
          onClick={onClose}
          className="text-neutral-400 transition-colors hover:text-neutral-900"
          aria-label="Close video player"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-2">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full rounded border border-neutral-200 bg-black"
          style={{ maxHeight: '280px' }}
        />
        <button
          type="button"
          className="w-full rounded bg-neutral-900 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onExtract}
          disabled={isExtracting || !isVideoReady}
        >
          {isExtracting ? 'Extracting...' : 'Extract Current Frame'}
        </button>
      </div>
    </div>
  );
}
