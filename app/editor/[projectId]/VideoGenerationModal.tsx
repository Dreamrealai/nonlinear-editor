/**
 * VideoGenerationModal Component
 * Modal for generating video using Veo 3.1
 */
'use client';

type VideoGenerationModalProps = {
  isOpen: boolean;
  isPending: boolean;
  operationName: string | null;
  onClose: () => void;
  onGenerate: (formData: {
    prompt: string;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    duration?: number;
  }) => void;
};

export function VideoGenerationModal({
  isOpen,
  isPending,
  operationName,
  onClose,
  onGenerate,
}: VideoGenerationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Generate Video with Veo 3.1</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onGenerate({
              prompt: formData.get('prompt') as string,
              aspectRatio: (formData.get('aspectRatio') as '9:16' | '16:9' | '1:1') || '16:9',
              duration: parseInt(formData.get('duration') as string) || 8,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="video-prompt"
              className="block text-xs font-medium text-neutral-700 mb-1"
            >
              Video Description
            </label>
            <textarea
              id="video-prompt"
              name="prompt"
              required
              disabled={isPending}
              placeholder="Describe the video you want to generate..."
              rows={4}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="video-aspect-ratio"
              className="block text-xs font-medium text-neutral-700 mb-1"
            >
              Aspect Ratio
            </label>
            <select
              id="video-aspect-ratio"
              name="aspectRatio"
              disabled={isPending}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="video-duration"
              className="block text-xs font-medium text-neutral-700 mb-1"
            >
              Duration (seconds)
            </label>
            <select
              id="video-duration"
              name="duration"
              disabled={isPending}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="5">5 seconds</option>
              <option value="8">8 seconds</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Generating...' : 'Generate Video'}
            </button>
          </div>

          {isPending && operationName && (
            <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
              Video generation in progress. This may take several minutes. You can close this modal
              and continue working.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
