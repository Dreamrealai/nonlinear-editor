import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { CreateProjectButton } from '@/components/CreateProjectButton';

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
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-900">My Projects</h1>
          <div className="flex gap-3">
            <CreateProjectButton />
            <Link
              href="/logout"
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow hover:bg-neutral-50"
            >
              Sign Out
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/editor/${project.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-neutral-900">{project.title || 'Untitled Project'}</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
              <p className="mb-4 text-neutral-600">No projects yet. Create one to get started.</p>
              <CreateProjectButton />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
