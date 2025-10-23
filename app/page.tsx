import { redirect } from 'next/navigation';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import HomeHeader from '@/components/HomeHeader';
import { ProjectList } from '@/components/ProjectList';
import { CreateProjectButton } from '@/components/CreateProjectButton';
import { Toaster } from 'react-hot-toast';

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

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <Toaster position="bottom-right" />
      <div className="mx-auto max-w-4xl">
        <HomeHeader />

        {projects && projects.length > 0 ? (
          <ProjectList projects={projects} />
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
            <p className="mb-4 text-neutral-600">No projects yet. Create one to get started.</p>
            <CreateProjectButton />
          </div>
        )}
      </div>
    </div>
  );
}
