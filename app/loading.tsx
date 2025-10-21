export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900"></div>
        <p className="text-sm text-neutral-600">Loading...</p>
      </div>
    </div>
  );
}
