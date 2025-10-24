-- =============================================================================
-- Export Presets Migration
-- =============================================================================
-- Adds support for export presets (platform-specific and custom)
-- =============================================================================

-- Export Presets Table
create table if not exists export_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_custom boolean not null default false,
  is_platform boolean not null default false,
  platform_type text check (platform_type in (
    'youtube_1080p', 'youtube_4k', 'youtube_shorts',
    'instagram_feed', 'instagram_story', 'instagram_reel',
    'tiktok', 'twitter', 'facebook', 'linkedin',
    'custom'
  )),
  settings jsonb not null default '{}'::jsonb,
  -- Settings JSONB structure:
  -- {
  --   "width": 1920,
  --   "height": 1080,
  --   "fps": 30,
  --   "vBitrateK": 8000,
  --   "aBitrateK": 192,
  --   "format": "mp4",
  --   "codec": "h264"
  -- }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists export_presets_user_idx on export_presets(user_id);
create index if not exists export_presets_platform_idx on export_presets(platform_type) where is_platform = true;
create index if not exists export_presets_custom_idx on export_presets(user_id) where is_custom = true;

-- RLS Policies
alter table export_presets enable row level security;

-- Users can read their own presets and platform presets
create policy "export_presets_select"
  on export_presets for select to authenticated
  using (
    auth.uid() = user_id or is_platform = true
  );

-- Users can insert their own custom presets
create policy "export_presets_insert"
  on export_presets for insert to authenticated
  with check (
    auth.uid() = user_id and is_custom = true and is_platform = false
  );

-- Users can update their own custom presets
create policy "export_presets_update"
  on export_presets for update to authenticated
  using (
    auth.uid() = user_id and is_custom = true
  )
  with check (
    auth.uid() = user_id and is_custom = true
  );

-- Users can delete their own custom presets
create policy "export_presets_delete"
  on export_presets for delete to authenticated
  using (
    auth.uid() = user_id and is_custom = true
  );

-- =============================================================================
-- Seed Platform Presets
-- =============================================================================

-- Create a service user for platform presets (using a well-known UUID)
-- Note: In production, you'd use a real service account
-- For now, we'll insert presets that can be read by all authenticated users

-- YouTube Presets
insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1), -- Use first user as owner, but is_platform=true makes it readable by all
  'YouTube 1080p',
  'Full HD for YouTube (1920x1080, 30fps)',
  true,
  'youtube_1080p',
  '{"width": 1920, "height": 1080, "fps": 30, "vBitrateK": 8000, "aBitrateK": 192, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'youtube_1080p');

insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'YouTube 4K',
  'Ultra HD for YouTube (3840x2160, 60fps)',
  true,
  'youtube_4k',
  '{"width": 3840, "height": 2160, "fps": 60, "vBitrateK": 35000, "aBitrateK": 320, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'youtube_4k');

insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'YouTube Shorts',
  'Vertical video for YouTube Shorts (1080x1920, 30fps)',
  true,
  'youtube_shorts',
  '{"width": 1080, "height": 1920, "fps": 30, "vBitrateK": 5000, "aBitrateK": 192, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'youtube_shorts');

-- Instagram Presets
insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'Instagram Feed',
  'Square video for Instagram Feed (1080x1080, 30fps)',
  true,
  'instagram_feed',
  '{"width": 1080, "height": 1080, "fps": 30, "vBitrateK": 5000, "aBitrateK": 128, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'instagram_feed');

insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'Instagram Story',
  'Vertical video for Instagram Stories (1080x1920, 30fps)',
  true,
  'instagram_story',
  '{"width": 1080, "height": 1920, "fps": 30, "vBitrateK": 5000, "aBitrateK": 128, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'instagram_story');

insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'Instagram Reel',
  'Vertical video for Instagram Reels (1080x1920, 30fps)',
  true,
  'instagram_reel',
  '{"width": 1080, "height": 1920, "fps": 30, "vBitrateK": 5000, "aBitrateK": 128, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'instagram_reel');

-- TikTok Preset
insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'TikTok',
  'Vertical video for TikTok (1080x1920, 30fps)',
  true,
  'tiktok',
  '{"width": 1080, "height": 1920, "fps": 30, "vBitrateK": 5000, "aBitrateK": 128, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'tiktok');

-- Twitter Preset
insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'Twitter',
  'Optimized for Twitter (1280x720, 30fps)',
  true,
  'twitter',
  '{"width": 1280, "height": 720, "fps": 30, "vBitrateK": 5000, "aBitrateK": 128, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'twitter');

-- Facebook Preset
insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'Facebook',
  'Optimized for Facebook (1920x1080, 30fps)',
  true,
  'facebook',
  '{"width": 1920, "height": 1080, "fps": 30, "vBitrateK": 5000, "aBitrateK": 192, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'facebook');

-- LinkedIn Preset
insert into export_presets (id, user_id, name, description, is_platform, platform_type, settings)
select
  gen_random_uuid(),
  (select id from auth.users limit 1),
  'LinkedIn',
  'Professional video for LinkedIn (1920x1080, 30fps)',
  true,
  'linkedin',
  '{"width": 1920, "height": 1080, "fps": 30, "vBitrateK": 5000, "aBitrateK": 192, "format": "mp4", "codec": "h264"}'::jsonb
where not exists (select 1 from export_presets where platform_type = 'linkedin');

-- =============================================================================
-- End of Migration
-- =============================================================================
