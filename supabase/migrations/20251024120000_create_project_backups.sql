-- =============================================================================
-- Project Backups Table
-- =============================================================================
-- Store version history of projects for backup and restore functionality
-- =============================================================================

-- Create project_backups table
create table if not exists project_backups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  backup_name text not null,
  backup_type text check (backup_type in ('auto', 'manual')) not null default 'auto',
  project_data jsonb not null,
  timeline_data jsonb not null,
  assets_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Add indexes for performance
create index if not exists project_backups_project_id_idx on project_backups(project_id, created_at desc);
create index if not exists project_backups_user_id_idx on project_backups(user_id, created_at desc);
create index if not exists project_backups_type_idx on project_backups(backup_type);

-- Enable RLS
alter table project_backups enable row level security;

-- RLS policies
create policy "project_backups_owner_select"
  on project_backups for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_backups.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_backups_owner_insert"
  on project_backups for insert to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = project_backups.project_id
        and p.user_id = auth.uid()
    ) and user_id = auth.uid()
  );

create policy "project_backups_owner_delete"
  on project_backups for delete to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_backups.project_id
        and p.user_id = auth.uid()
    )
  );

-- Function to clean up old auto backups (keep only last 10 per project)
create or replace function cleanup_old_auto_backups()
returns trigger as $$
begin
  -- Delete old auto backups, keeping only the 10 most recent
  delete from project_backups
  where id in (
    select id
    from project_backups
    where project_id = NEW.project_id
      and backup_type = 'auto'
    order by created_at desc
    offset 10
  );
  return NEW;
end;
$$ language plpgsql;

-- Trigger to auto-cleanup after insert
create trigger cleanup_old_auto_backups_trigger
  after insert on project_backups
  for each row
  when (NEW.backup_type = 'auto')
  execute function cleanup_old_auto_backups();

-- Add comment
comment on table project_backups is 'Version history of projects for backup and restore functionality';
