import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getCachedProjectMetadata } from '@/lib/cachedData';
import { EditorHeader } from '@/components/EditorHeader';
import { GenerateVideoTab } from '@/components/generation/GenerateVideoTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

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

export default async function EditorPage({
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
      name="VideoGenerationPage"
      context={{ projectId, page: 'generate-video' }}
      fallback={
        <ErrorFallback
          title="Video Generation Error"
          message="An error occurred while loading the video generation page. Please try refreshing or return to the project list."
        />
      }
    >
      <div className="flex h-full flex-col">
        <EditorHeader projectId={projectId} currentTab="generate-video" />
        <GenerateVideoTab projectId={projectId} />
      </div>
    </ErrorBoundary>
  );
}
