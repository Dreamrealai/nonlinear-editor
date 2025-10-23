import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'projects.create.request_started',
    }, 'Project creation request received');

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      serverLogger.warn({
        event: 'projects.create.unauthorized',
      }, 'Unauthorized project creation attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = body.title || 'Untitled Project';

    serverLogger.debug({
      event: 'projects.create.creating',
      userId: user.id,
      title,
    }, 'Creating new project');

    const { data: project, error: dbError } = await supabase
      .from('projects')
      .insert({
        title,
        user_id: user.id,
        timeline_state_jsonb: {}
      })
      .select()
      .single();

    if (dbError) {
      serverLogger.error({
        event: 'projects.create.db_error',
        userId: user.id,
        title,
        error: dbError.message,
        code: dbError.code,
      }, 'Database error creating project');
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'projects.create.success',
      userId: user.id,
      projectId: project.id,
      title,
      duration,
    }, `Project created successfully in ${duration}ms`);

    return NextResponse.json(project);
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'projects.create.error',
      error,
      duration,
    }, 'Error creating project');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
