import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { ProjectService } from '@/lib/services/projectService';
import { getCachedProjectMetadata } from '@/lib/cachedData';
import EditorHeader from '@/components/EditorHeader';
import GenerateVideoTab from '@/components/generation/GenerateVideoTab';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * CACHING STRATEGY:
 * - User authentication: Must remain dynamic (user-specific)
 * - Project metadata: Cached with getCachedProjectMetadata (2-minute TTL)
 * - Cache invalidation: Automatic on project updates
 * - Revalidation: Not applicable (client component handles rendering)
 *
 * This page uses server-side caching for project metadata while maintaining
 * dynamic rendering for authentication. The client component handles all
 * dynamic content updates.
 */
export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  // Redirect to home if Supabase not configured
  if (!isSupabaseConfigured()) {
    redirect('/');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const { projectId } = await params;

  // Fetch project metadata with caching (2-minute TTL)
  const project = await getCachedProjectMetadata(supabase, projectId, user.id);

  if (!project) {
    redirect('/');
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-full flex-col items-center justify-center bg-neutral-50 p-8">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">Video Generation Error</h2>
            <p className="text-sm text-neutral-600 mb-4">
              An error occurred while loading the video generation page. Please try refreshing or
              return to the project list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Reload Page
              </button>
              <Link
                href="/"
                className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 text-center"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <EditorHeader projectId={projectId} currentTab="generate-video" />
        <GenerateVideoTab projectId={projectId} />
      </div>
    </ErrorBoundary>
  );
}
