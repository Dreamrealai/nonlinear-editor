import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getCachedProjectMetadata } from '@/lib/cachedData';
import { BrowserEditorClient } from '../BrowserEditorClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        title: 'Timeline Editor',
        description:
          'Advanced timeline editing with multi-track support, transitions, and effects.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const { projectId } = await params;
    const project = await getCachedProjectMetadata(supabase, projectId, user.id);

    if (project) {
      return {
        title: `${project.title} - Timeline Editor`,
        description: `Edit ${project.title} with advanced timeline tools`,
        robots: {
          index: false,
          follow: false,
        },
      };
    }
  } catch {
    // Fallback metadata on error
  }

  return {
    title: 'Timeline Editor',
    description: 'Advanced timeline editing with multi-track support, transitions, and effects.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function TimelineEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<React.JSX.Element> {
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
      name="TimelineEditorPage"
      context={{ projectId, page: 'timeline' }}
      fallback={
        <div className="flex h-full flex-col items-center justify-center bg-neutral-50 p-8">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-3">Timeline Editor Error</h2>
            <p className="text-sm text-neutral-600 mb-4">
              An error occurred while loading the timeline editor. This may be due to corrupted
              project data or a temporary issue.
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
      <BrowserEditorClient projectId={projectId} />
    </ErrorBoundary>
  );
}
