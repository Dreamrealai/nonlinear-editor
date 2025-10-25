import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getCachedProjectMetadata } from '@/lib/cachedData';
import { BrowserEditorClient } from '../BrowserEditorClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TimelineErrorFallback } from './TimelineErrorFallback';

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
      fallback={<TimelineErrorFallback />}
    >
      <BrowserEditorClient projectId={projectId} />
    </ErrorBoundary>
  );
}
