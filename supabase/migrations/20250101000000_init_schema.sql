-- =============================================================================
-- Nonlinear Editor Database Schema
-- =============================================================================
-- Complete schema for browser-based video editor with keyframe editing
-- Standalone editor with no external video processing dependencies
-- =============================================================================

-- Enable extensions
create extension if not exists "pgcrypto";

-- =============================================================================
-- Core Tables
-- =============================================================================

-- Projects: Video editing projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Project',
  timeline_state_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects enable row level security;

create policy "projects_owner_select"
  on projects for select to authenticated
  using (auth.uid() = user_id);

create policy "projects_owner_mod"
  on projects for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Assets: Media files (video, audio, image)
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_url text not null,
  type text check (type in ('video', 'audio', 'image')) not null,
  duration_seconds numeric,
  metadata jsonb not null default '{}'::jsonb,
  source text check (source in ('upload', 'genai', 'ingest')) not null default 'upload',
  file_path text,
  mime_type text,
  duration_sec numeric,
  width integer,
  height integer,
  created_at timestamptz default now()
);

alter table assets enable row level security;

create policy "assets_owner_select"
  on assets for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "assets_owner_mod"
  on assets for all to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  );

-- Scenes: Detected scenes from video analysis
create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  asset_id uuid references assets(id) on delete set null,
  start_ms bigint not null,
  end_ms bigint not null,
  created_at timestamptz default now()
);

alter table scenes enable row level security;

create policy "scenes_owner_all"
  on scenes for all to authenticated
  using (
    exists(select 1 from projects p where p.id = scenes.project_id and p.user_id = auth.uid())
  )
  with check (
    exists(select 1 from projects p where p.id = scenes.project_id and p.user_id = auth.uid())
  );

-- Timelines: Browser-based editor state
create table if not exists timelines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  timeline_data jsonb not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists timelines_project_unique on timelines(project_id);

alter table timelines enable row level security;

create policy "timelines_owner_select"
  on timelines for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = timelines.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "timelines_owner_mod"
  on timelines for all to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = timelines.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = timelines.project_id
        and p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Keyframe Editor Tables
-- =============================================================================

-- Frame kinds enum
do $$
begin
  create type frame_kind as enum ('first', 'middle', 'last', 'custom');
exception
  when duplicate_object then null;
end$$;

-- Scene Frames: Extracted keyframes from video scenes
create table if not exists scene_frames (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  scene_id uuid references scenes(id) on delete cascade,
  kind frame_kind not null,
  t_ms integer not null,
  storage_path text not null,
  width integer,
  height integer,
  created_at timestamptz default now()
);

create index if not exists scene_frames_scene_idx on scene_frames(scene_id);
create index if not exists scene_frames_asset_idx on scene_frames(asset_id);
create unique index if not exists scene_frames_scene_kind_unique
  on scene_frames(scene_id, kind) where scene_id is not null;

alter table scene_frames enable row level security;

create policy "scene_frames_owner_select"
  on scene_frames for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = scene_frames.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "scene_frames_owner_mod"
  on scene_frames for all to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = scene_frames.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = scene_frames.project_id
        and p.user_id = auth.uid()
    )
  );

-- Frame Edits: AI-generated edits of keyframes
create table if not exists frame_edits (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null references scene_frames(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  version integer not null,
  mode text not null check (mode in ('global', 'crop')),
  prompt text not null,
  model text not null,
  crop_x integer,
  crop_y integer,
  crop_size integer,
  feather_px integer,
  harmonized boolean default false,
  input_refs jsonb,
  output_storage_path text not null,
  created_at timestamptz default now()
);

create unique index if not exists frame_edits_frame_version_unique
  on frame_edits(frame_id, version);

create index if not exists frame_edits_frame_idx on frame_edits(frame_id);

alter table frame_edits enable row level security;

create policy "frame_edits_owner_select"
  on frame_edits for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = frame_edits.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "frame_edits_owner_mod"
  on frame_edits for all to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = frame_edits.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = frame_edits.project_id
        and p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Storage Buckets
-- =============================================================================

-- Assets bucket for uploaded media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  false,
  524288000, -- 500 MB limit
  array[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4'
  ]
)
on conflict (id) do nothing;

-- Frames bucket for keyframe images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'frames',
  'frames',
  false,
  52428800, -- 50 MB limit
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;

-- Frame edits bucket for AI-edited frames
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'frame-edits',
  'frame-edits',
  false,
  104857600, -- 100 MB limit
  array[
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do nothing;

-- =============================================================================
-- Storage RLS Policies
-- =============================================================================

-- Assets bucket policies
create policy "Users can upload to own folder in assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assets' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own files in assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'assets' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own files in assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'assets' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'assets' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own files in assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'assets' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Service role has full access to assets"
on storage.objects for all to service_role
using (bucket_id = 'assets')
with check (bucket_id = 'assets');

-- Frames bucket policies
create policy "Users can upload to own folder in frames"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'frames' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own files in frames"
on storage.objects for select to authenticated
using (
  bucket_id = 'frames' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own files in frames"
on storage.objects for update to authenticated
using (
  bucket_id = 'frames' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'frames' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own files in frames"
on storage.objects for delete to authenticated
using (
  bucket_id = 'frames' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Service role has full access to frames"
on storage.objects for all to service_role
using (bucket_id = 'frames')
with check (bucket_id = 'frames');

-- Frame-edits bucket policies
create policy "Users can upload to own folder in frame-edits"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'frame-edits' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own files in frame-edits"
on storage.objects for select to authenticated
using (
  bucket_id = 'frame-edits' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own files in frame-edits"
on storage.objects for update to authenticated
using (
  bucket_id = 'frame-edits' and
  (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'frame-edits' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own files in frame-edits"
on storage.objects for delete to authenticated
using (
  bucket_id = 'frame-edits' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Service role has full access to frame-edits"
on storage.objects for all to service_role
using (bucket_id = 'frame-edits')
with check (bucket_id = 'frame-edits');

-- =============================================================================
-- AI Chat Assistant Tables
-- =============================================================================

-- Chat Messages: AI assistant conversation history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  attachments jsonb,
  created_at timestamptz default now()
);

create index if not exists chat_messages_project_idx on chat_messages(project_id);
create index if not exists chat_messages_created_idx on chat_messages(created_at desc);

alter table chat_messages enable row level security;

create policy "chat_messages_owner_select"
  on chat_messages for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = chat_messages.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_messages_owner_insert"
  on chat_messages for insert to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = chat_messages.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "chat_messages_owner_delete"
  on chat_messages for delete to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = chat_messages.project_id
        and p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- End of Migration
-- =============================================================================
