import { redirect } from 'next/navigation';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import KeyframePageClient from './KeyframePageClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function KeyFrameEditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  // Redirect to home if Supabase not configured
  if (!isSupabaseConfigured()) {
    redirect('/');
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const { projectId } = await params;

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!project) {
    redirect('/');
  }

  return <KeyframePageClient projectId={projectId} />;
}
