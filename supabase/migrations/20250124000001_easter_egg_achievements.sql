-- =============================================================================
-- Easter Egg Achievement System
-- =============================================================================
-- Tracks user discovery and interaction with easter eggs
-- =============================================================================

-- Easter Egg Achievements: Track which easter eggs user has discovered
create table if not exists easter_egg_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  egg_id text not null check (egg_id in ('konami', 'devmode', 'matrix', 'disco', 'gravity')),
  discovered_at timestamptz not null default now(),
  activation_count integer not null default 1,
  total_duration_ms bigint not null default 0,
  last_activated_at timestamptz,
  shared boolean default false,
  shared_at timestamptz,
  created_at timestamptz default now()
);

-- Ensure unique user-egg combinations
create unique index if not exists easter_egg_achievements_user_egg_unique
  on easter_egg_achievements(user_id, egg_id);

-- Index for leaderboard queries
create index if not exists easter_egg_achievements_discovered_idx
  on easter_egg_achievements(discovered_at);
create index if not exists easter_egg_achievements_user_idx
  on easter_egg_achievements(user_id);

-- Enable RLS
alter table easter_egg_achievements enable row level security;

-- Users can view their own achievements
create policy "easter_egg_achievements_owner_select"
  on easter_egg_achievements for select to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own achievements
create policy "easter_egg_achievements_owner_insert"
  on easter_egg_achievements for insert to authenticated
  with check (auth.uid() = user_id);

-- Users can update their own achievements
create policy "easter_egg_achievements_owner_update"
  on easter_egg_achievements for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Easter Egg Feedback: Collect user feedback on easter eggs
create table if not exists easter_egg_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  favorite_egg text check (favorite_egg in ('konami', 'devmode', 'matrix', 'disco', 'gravity', 'none')),
  suggestions text,
  created_at timestamptz default now()
);

-- One feedback per user
create unique index if not exists easter_egg_feedback_user_unique
  on easter_egg_feedback(user_id);

-- Enable RLS
alter table easter_egg_feedback enable row level security;

-- Users can view their own feedback
create policy "easter_egg_feedback_owner_select"
  on easter_egg_feedback for select to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own feedback
create policy "easter_egg_feedback_owner_insert"
  on easter_egg_feedback for insert to authenticated
  with check (auth.uid() = user_id);

-- Easter Egg Leaderboard View
-- Shows users who discovered all 5 eggs
create or replace view easter_egg_leaderboard as
select
  u.id as user_id,
  u.email,
  count(distinct e.egg_id) as eggs_discovered,
  min(e.discovered_at) as first_discovery,
  max(e.discovered_at) as last_discovery,
  max(e.discovered_at) - min(e.discovered_at) as discovery_duration,
  sum(e.activation_count) as total_activations,
  count(case when e.shared then 1 end) as eggs_shared
from auth.users u
left join easter_egg_achievements e on u.id = e.user_id
group by u.id, u.email
order by eggs_discovered desc, discovery_duration asc;

-- Grant access to authenticated users to view leaderboard
grant select on easter_egg_leaderboard to authenticated;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to record easter egg discovery/activation
create or replace function record_easter_egg_activation(
  p_egg_id text,
  p_duration_ms bigint default 0
)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_result json;
  v_is_new_discovery boolean := false;
  v_total_discovered integer := 0;
  v_achievement_unlocked text := null;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Insert or update achievement
  insert into easter_egg_achievements (
    user_id,
    egg_id,
    activation_count,
    total_duration_ms,
    last_activated_at
  )
  values (
    v_user_id,
    p_egg_id,
    1,
    p_duration_ms,
    now()
  )
  on conflict (user_id, egg_id) do update set
    activation_count = easter_egg_achievements.activation_count + 1,
    total_duration_ms = easter_egg_achievements.total_duration_ms + p_duration_ms,
    last_activated_at = now();

  -- Check if this was a new discovery
  select
    case when activation_count = 1 then true else false end into v_is_new_discovery
  from easter_egg_achievements
  where user_id = v_user_id and egg_id = p_egg_id;

  -- Check for achievements
  select count(distinct egg_id) into v_total_discovered
  from easter_egg_achievements
  where user_id = v_user_id;

  -- Award achievements
  if v_total_discovered = 5 then
    v_achievement_unlocked := 'easter_egg_master';
  elsif v_total_discovered = 3 then
    v_achievement_unlocked := 'easter_egg_hunter';
  elsif v_is_new_discovery then
    v_achievement_unlocked := 'first_easter_egg';
  end if;

  -- Build result
  v_result := json_build_object(
    'egg_id', p_egg_id,
    'is_new_discovery', v_is_new_discovery,
    'total_discovered', v_total_discovered,
    'achievement_unlocked', v_achievement_unlocked
  );

  return v_result;
end;
$$;

-- Function to record easter egg share
create or replace function record_easter_egg_share(
  p_egg_id text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Update achievement with share info
  update easter_egg_achievements
  set
    shared = true,
    shared_at = now()
  where user_id = v_user_id and egg_id = p_egg_id;

  return found;
end;
$$;

-- Function to submit easter egg feedback
create or replace function submit_easter_egg_feedback(
  p_rating integer,
  p_favorite_egg text default null,
  p_suggestions text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_feedback_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate rating
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  -- Insert feedback
  insert into easter_egg_feedback (
    user_id,
    rating,
    favorite_egg,
    suggestions
  )
  values (
    v_user_id,
    p_rating,
    p_favorite_egg,
    p_suggestions
  )
  on conflict (user_id) do update set
    rating = excluded.rating,
    favorite_egg = excluded.favorite_egg,
    suggestions = excluded.suggestions,
    created_at = now()
  returning id into v_feedback_id;

  return v_feedback_id;
end;
$$;

-- =============================================================================
-- End of Migration
-- =============================================================================
