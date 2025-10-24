-- =============================================================================
-- Project Sharing Features Migration (Phase 2)
-- =============================================================================
-- Adds share links, invites, and activity logging
-- =============================================================================

-- Share Links Table
create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  role text not null check (role in ('viewer', 'editor')) default 'viewer',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz,
  max_uses integer,
  current_uses integer not null default 0,
  is_active boolean not null default true
);

-- Project Invites Table
create table if not exists project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('viewer', 'editor', 'admin')) default 'viewer',
  invited_by uuid not null references auth.users(id) on delete cascade,
  invited_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  status text not null check (status in ('pending', 'accepted', 'expired', 'revoked')) default 'pending',
  unique(project_id, email)
);

-- Collaboration Activity Table
create table if not exists collaboration_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists share_links_project_idx on share_links(project_id);
create index if not exists share_links_token_idx on share_links(token);
create index if not exists share_links_active_idx on share_links(is_active) where is_active = true;

create index if not exists project_invites_project_idx on project_invites(project_id);
create index if not exists project_invites_email_idx on project_invites(email);
create index if not exists project_invites_token_idx on project_invites(token);
create index if not exists project_invites_status_idx on project_invites(status);

create index if not exists collaboration_activity_project_idx on collaboration_activity(project_id);
create index if not exists collaboration_activity_user_idx on collaboration_activity(user_id);
create index if not exists collaboration_activity_created_idx on collaboration_activity(created_at desc);

-- RLS Policies for share_links
alter table share_links enable row level security;

-- Users can see share links for projects they own or have access to
create policy "share_links_select"
  on share_links for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = share_links.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc
          where pc.project_id = p.id
            and pc.user_id = auth.uid()
            and pc.role in ('owner', 'editor')
        ))
    )
  );

-- Project owners can create share links
create policy "share_links_insert"
  on share_links for insert to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = share_links.project_id
        and p.user_id = auth.uid()
    )
  );

-- Project owners can update share links
create policy "share_links_update"
  on share_links for update to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = share_links.project_id
        and p.user_id = auth.uid()
    )
  );

-- Project owners can delete share links
create policy "share_links_delete"
  on share_links for delete to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = share_links.project_id
        and p.user_id = auth.uid()
    )
  );

-- RLS Policies for project_invites
alter table project_invites enable row level security;

-- Users can see invites for their email or projects they own
create policy "project_invites_select"
  on project_invites for select to authenticated
  using (
    email = (select email from auth.users where id = auth.uid())
    or exists (
      select 1 from projects p
      where p.id = project_invites.project_id
        and p.user_id = auth.uid()
    )
  );

-- Project owners can create invites
create policy "project_invites_insert"
  on project_invites for insert to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = project_invites.project_id
        and p.user_id = auth.uid()
    )
  );

-- Project owners can update invites
create policy "project_invites_update"
  on project_invites for update to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_invites.project_id
        and p.user_id = auth.uid()
    )
  );

-- Project owners can delete invites
create policy "project_invites_delete"
  on project_invites for delete to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = project_invites.project_id
        and p.user_id = auth.uid()
    )
  );

-- RLS Policies for collaboration_activity
alter table collaboration_activity enable row level security;

-- Users can see activity for projects they have access to
create policy "collaboration_activity_select"
  on collaboration_activity for select to authenticated
  using (
    exists (
      select 1 from projects p
      where p.id = collaboration_activity.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc
          where pc.project_id = p.id
            and pc.user_id = auth.uid()
        ))
    )
  );

-- Users can insert activity for projects they have access to
create policy "collaboration_activity_insert"
  on collaboration_activity for insert to authenticated
  with check (
    exists (
      select 1 from projects p
      where p.id = collaboration_activity.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc
          where pc.project_id = p.id
            and pc.user_id = auth.uid()
        ))
    )
  );

-- Function to use share link
create or replace function use_share_link(p_token text)
returns table (
  project_id uuid,
  role text,
  link_valid boolean,
  error_message text
) as $$
declare
  v_link share_links;
  v_user_id uuid;
begin
  -- Get current user
  v_user_id := auth.uid();

  if v_user_id is null then
    return query select null::uuid, null::text, false, 'Not authenticated'::text;
    return;
  end if;

  -- Get share link
  select * into v_link
  from share_links
  where token = p_token
    and is_active = true;

  -- Check if link exists
  if v_link is null then
    return query select null::uuid, null::text, false, 'Invalid or inactive link'::text;
    return;
  end if;

  -- Check if link expired
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return query select null::uuid, null::text, false, 'Link has expired'::text;
    return;
  end if;

  -- Check max uses
  if v_link.max_uses is not null and v_link.current_uses >= v_link.max_uses then
    return query select null::uuid, null::text, false, 'Link usage limit reached'::text;
    return;
  end if;

  -- Check if user is already a collaborator
  if exists (
    select 1 from project_collaborators
    where project_id = v_link.project_id
      and user_id = v_user_id
  ) then
    return query select v_link.project_id, v_link.role, true, 'Already a collaborator'::text;
    return;
  end if;

  -- Add user as collaborator
  insert into project_collaborators (project_id, user_id, role, invited_by, accepted_at)
  values (v_link.project_id, v_user_id, v_link.role, v_link.created_by, now())
  on conflict (project_id, user_id) do nothing;

  -- Increment usage count
  update share_links
  set current_uses = current_uses + 1
  where id = v_link.id;

  -- Log activity
  insert into collaboration_activity (project_id, user_id, action, details)
  values (
    v_link.project_id,
    v_user_id,
    'joined_via_link',
    jsonb_build_object('role', v_link.role, 'link_id', v_link.id)
  );

  return query select v_link.project_id, v_link.role, true, 'Success'::text;
end;
$$ language plpgsql security definer;

-- Function to accept invite
create or replace function accept_project_invite(p_token text)
returns table (
  project_id uuid,
  role text,
  invite_valid boolean,
  error_message text
) as $$
declare
  v_invite project_invites;
  v_user_id uuid;
  v_user_email text;
begin
  -- Get current user
  v_user_id := auth.uid();

  if v_user_id is null then
    return query select null::uuid, null::text, false, 'Not authenticated'::text;
    return;
  end if;

  -- Get user email
  select email into v_user_email
  from auth.users
  where id = v_user_id;

  -- Get invite
  select * into v_invite
  from project_invites
  where token = p_token
    and status = 'pending';

  -- Check if invite exists
  if v_invite is null then
    return query select null::uuid, null::text, false, 'Invalid or already used invite'::text;
    return;
  end if;

  -- Check if email matches
  if v_invite.email != v_user_email then
    return query select null::uuid, null::text, false, 'This invite is for a different email address'::text;
    return;
  end if;

  -- Check if invite expired
  if v_invite.expires_at < now() then
    update project_invites set status = 'expired' where id = v_invite.id;
    return query select null::uuid, null::text, false, 'Invite has expired'::text;
    return;
  end if;

  -- Add user as collaborator
  insert into project_collaborators (project_id, user_id, role, invited_by, accepted_at)
  values (v_invite.project_id, v_user_id, v_invite.role, v_invite.invited_by, now())
  on conflict (project_id, user_id) do update
  set role = excluded.role, accepted_at = excluded.accepted_at;

  -- Mark invite as accepted
  update project_invites
  set status = 'accepted', accepted_at = now()
  where id = v_invite.id;

  -- Log activity
  insert into collaboration_activity (project_id, user_id, action, details)
  values (
    v_invite.project_id,
    v_user_id,
    'accepted_invite',
    jsonb_build_object('role', v_invite.role, 'invite_id', v_invite.id)
  );

  return query select v_invite.project_id, v_invite.role, true, 'Success'::text;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- End of Migration
-- =============================================================================
