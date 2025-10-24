-- =============================================================================
-- Asset Version History Migration
-- =============================================================================
-- Tracks asset versions when assets are updated, allowing users to:
-- 1. View version history
-- 2. Revert to previous versions
-- 3. Compare versions
-- =============================================================================

-- Asset Versions: Tracks historical versions of assets when they're updated
create table if not exists asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,

  -- Version information
  version_number integer not null,
  version_label text,

  -- Storage information for the previous version
  storage_url text not null,
  storage_path text not null,

  -- Asset metadata at time of versioning
  type text check (type in ('video', 'audio', 'image')) not null,
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  duration_seconds numeric,

  -- Full metadata snapshot
  metadata jsonb not null default '{}'::jsonb,

  -- Change tracking
  change_reason text,
  changed_by uuid references auth.users(id) on delete set null,

  created_at timestamptz default now(),

  -- Ensure version numbers are unique per asset and sequential
  constraint asset_versions_version_unique unique (asset_id, version_number)
);

-- Indexes for performance
create index if not exists asset_versions_asset_id_idx on asset_versions(asset_id);
create index if not exists asset_versions_user_id_idx on asset_versions(user_id);
create index if not exists asset_versions_project_id_idx on asset_versions(project_id);
create index if not exists asset_versions_created_at_idx on asset_versions(created_at desc);
create index if not exists asset_versions_asset_created_idx on asset_versions(asset_id, created_at desc);

-- Enable RLS
alter table asset_versions enable row level security;

-- RLS Policies: Users can view versions for assets in their projects
create policy "asset_versions_owner_select"
  on asset_versions for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = asset_versions.project_id
        and p.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can create versions for assets in their projects
create policy "asset_versions_owner_insert"
  on asset_versions for insert to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = asset_versions.project_id
        and p.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can update versions for assets in their projects
create policy "asset_versions_owner_update"
  on asset_versions for update to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = asset_versions.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = asset_versions.project_id
        and p.user_id = auth.uid()
    )
  );

-- RLS Policies: Users can delete versions for assets in their projects
create policy "asset_versions_owner_delete"
  on asset_versions for delete to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = asset_versions.project_id
        and p.user_id = auth.uid()
    )
  );

-- Function to get next version number for an asset
create or replace function get_next_asset_version_number(p_asset_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_max_version integer;
begin
  select coalesce(max(version_number), 0) + 1
  into v_max_version
  from asset_versions
  where asset_id = p_asset_id;

  return v_max_version;
end;
$$;

-- Add version tracking metadata to assets table
-- This tracks the current version number without storing full version data
alter table assets
add column if not exists current_version integer default 1;

-- Add comment to explain the version history system
comment on table asset_versions is 'Stores historical versions of assets when they are updated. Each update creates a new version record with the previous asset state, allowing users to view version history and revert to previous versions.';

comment on column asset_versions.version_number is 'Sequential version number starting at 1. Each update increments this number.';
comment on column asset_versions.storage_url is 'Storage URL for this version of the asset (e.g., supabase://assets/...)';
comment on column asset_versions.storage_path is 'Storage path for this version in Supabase Storage (e.g., user_id/project_id/folder/file.ext)';
comment on column asset_versions.change_reason is 'Optional description of why this version was created';
comment on column assets.current_version is 'Current version number of the asset. Increments with each update.';
