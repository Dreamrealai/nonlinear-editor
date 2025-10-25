import { redirect } from 'next/navigation';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { ProjectService } from '@/lib/services/projectService';
import { getCachedUserProjects } from '@/lib/cachedData';
import { invalidateUserProjects } from '@/lib/cacheInvalidation';
import { serverLogger } from '@/lib/serverLogger';

/**
 * CACHING STRATEGY:
 * - User authentication: Must remain dynamic (user-specific data)
 * - Project queries: Cached with getCachedUserProjects (2-minute TTL)
 * - Cache invalidation: Automatic on project creation
 * - Revalidation: Not applicable (redirects only, no rendered content)
 *
 * This page needs dynamic rendering for authentication checks but uses
 * server-side caching for database queries to reduce load times.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<React.JSX.Element> {
  // Handle case where Supabase is not configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">Supabase Not Configured</h1>
          <p className="mt-4 text-neutral-600">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables to
            enable authentication.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Use ProjectService for database operations
  const projectService = new ProjectService(supabase);

  // Get the most recent project using cached query (2-minute TTL)
  const projects = await getCachedUserProjects(supabase, user.id);

  let projectId: string;

  if (projects && projects.length > 0 && projects[0]) {
    // Use most recent project
    projectId = projects[0].id;
  } else {
    try {
      // Create a default project using ProjectService
      const newProject = await projectService.createProject(user.id, {
        title: 'My Project',
      });

      projectId = newProject.id;

      // Invalidate projects cache after creation
      await invalidateUserProjects(user.id);
    } catch (error) {
      serverLogger.error({ error, userId: user.id }, 'Failed to create default project');
      // Redirect to a error page or show message
      redirect('/error?message=Failed to create project');
    }
  }

  // Redirect directly to the video editor
  redirect(`/editor/${projectId}/timeline`);
}
