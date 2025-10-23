import { redirect } from 'next/navigation';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

// Force dynamic rendering when Supabase is not configured
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Handle case where Supabase is not configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">Supabase Not Configured</h1>
          <p className="mt-4 text-neutral-600">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables to enable authentication.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  // Get the most recent project or create a default one
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  let projectId: string;

  if (projects && projects.length > 0) {
    // Use most recent project
    projectId = projects[0].id;
  } else {
    // Create a default project
    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        title: 'My Project',
        user_id: user.id,
      })
      .select('id')
      .single();

    if (error || !newProject) {
      throw new Error('Failed to create default project');
    }

    projectId = newProject.id;
  }

  // Redirect directly to the video editor
  redirect(`/editor/${projectId}/timeline`);
}
