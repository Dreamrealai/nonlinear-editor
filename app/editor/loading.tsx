export default function EditorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-700 border-t-white"></div>
        <p className="text-sm text-neutral-400">Loading editor...</p>
      </div>
    </div>
  );
}
