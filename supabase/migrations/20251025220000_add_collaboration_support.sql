-- =============================================================================
-- Collaboration Support Migration (Phase 1 - Basic)
-- =============================================================================
-- Adds basic collaboration support with user presence tracking
-- =============================================================================

-- Project Collaborators Table
create table if not exists project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')) default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  last_seen_at timestamptz,
  is_online boolean not null default false,
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- Indexes
create index if not exists project_collaborators_project_idx on project_collaborators(project_id);
create index if not exists project_collaborators_user_idx on project_collaborators(user_id);
create index if not exists project_collaborators_online_idx on project_collaborators(is_online) where is_online = true;

-- RLS Policies
alter table project_collaborators enable row level security;

-- Users can see collaborators for projects they have access to
create policy "project_collaborators_select"
  on project_collaborators for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_collaborators.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc
          where pc.project_id = p.id
            and pc.user_id = auth.uid()
            and pc.accepted_at is not null
        ))
    )
  );

-- Project owners can insert collaborators
create policy "project_collaborators_insert"
  on project_collaborators for insert to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = project_collaborators.project_id
        and p.user_id = auth.uid()
    )
  );

-- Users can update their own presence status
create policy "project_collaborators_update_self"
  on project_collaborators for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Project owners can update all collaborator records
create policy "project_collaborators_update_owner"
  on project_collaborators for update to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_collaborators.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = project_collaborators.project_id
        and p.user_id = auth.uid()
    )
  );

-- Project owners can delete collaborators
create policy "project_collaborators_delete"
  on project_collaborators for delete to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_collaborators.project_id
        and p.user_id = auth.uid()
    )
  );

-- Function to update last_seen_at
create or replace function update_collaborator_presence(
  p_project_id uuid,
  p_user_id uuid,
  p_is_online boolean
)
returns void as $$
begin
  update project_collaborators
  set
    is_online = p_is_online,
    last_seen_at = now()
  where project_id = p_project_id
    and user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- End of Migration
-- =============================================================================
