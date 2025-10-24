-- =============================================================================
-- Project Templates Migration
-- =============================================================================
-- Adds support for project templates (intros, outros, transitions, etc.)
-- =============================================================================

-- Project Templates Table
create table if not exists project_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text not null check (category in (
    'intro', 'outro', 'transition', 'title', 'social_media',
    'commercial', 'tutorial', 'slideshow', 'lower_third', 'custom'
  )),
  thumbnail_url text,
  timeline_data jsonb not null,
  -- Timeline data includes clips, tracks, text overlays, etc.
  is_public boolean not null default false,
  is_featured boolean not null default false,
  tags text[] default array[]::text[],
  duration_seconds numeric,
  usage_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists project_templates_user_idx on project_templates(user_id);
create index if not exists project_templates_category_idx on project_templates(category);
create index if not exists project_templates_public_idx on project_templates(is_public) where is_public = true;
create index if not exists project_templates_featured_idx on project_templates(is_featured) where is_featured = true;
create index if not exists project_templates_tags_idx on project_templates using gin(tags);
create index if not exists project_templates_created_idx on project_templates(created_at desc);
create index if not exists project_templates_usage_idx on project_templates(usage_count desc);

-- Full-text search index
create index if not exists project_templates_search_idx on project_templates
  using gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- RLS Policies
alter table project_templates enable row level security;

-- Users can read their own templates and public templates
create policy "project_templates_select"
  on project_templates for select to authenticated
  using (
    auth.uid() = user_id or is_public = true
  );

-- Users can insert their own templates
create policy "project_templates_insert"
  on project_templates for insert to authenticated
  with check (
    auth.uid() = user_id
  );

-- Users can update their own templates
create policy "project_templates_update"
  on project_templates for update to authenticated
  using (
    auth.uid() = user_id
  )
  with check (
    auth.uid() = user_id
  );

-- Users can delete their own templates
create policy "project_templates_delete"
  on project_templates for delete to authenticated
  using (
    auth.uid() = user_id
  );

-- Function to update updated_at timestamp
create or replace function update_project_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_project_templates_updated_at
  before update on project_templates
  for each row
  execute function update_project_templates_updated_at();

-- Function to increment usage count
create or replace function increment_template_usage_count(template_id uuid)
returns void as $$
begin
  update project_templates
  set usage_count = usage_count + 1
  where id = template_id;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- End of Migration
-- =============================================================================
