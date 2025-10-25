-- =============================================================================
-- User Subscription System Migration
-- =============================================================================
-- Adds three-tier user system (Admin, Premium, Free) with Stripe integration
-- =============================================================================

-- User tier enum
create type user_tier as enum ('free', 'premium', 'admin');

-- =============================================================================
-- User Profiles Table
-- =============================================================================

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  tier user_tier not null default 'free',

  -- Stripe subscription data
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  subscription_status text,
  subscription_current_period_start timestamptz,
  subscription_current_period_end timestamptz,
  subscription_cancel_at_period_end boolean default false,

  -- Usage limits and tracking
  video_minutes_limit integer not null default 10,
  ai_requests_limit integer not null default 50,
  storage_gb_limit integer not null default 5,

  -- Current month usage
  video_minutes_used integer not null default 0,
  ai_requests_used integer not null default 0,
  storage_gb_used numeric(10,2) not null default 0,

  -- Reset tracking
  usage_reset_at timestamptz not null default date_trunc('month', now() + interval '1 month'),

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for faster lookups
create index if not exists user_profiles_stripe_customer_idx on user_profiles(stripe_customer_id);
create index if not exists user_profiles_stripe_subscription_idx on user_profiles(stripe_subscription_id);
create index if not exists user_profiles_tier_idx on user_profiles(tier);

-- Enable RLS
alter table user_profiles enable row level security;

-- Users can read their own profile
create policy "user_profiles_own_select"
  on user_profiles for select to authenticated
  using (auth.uid() = id);

-- Users can update their own profile (limited fields)
create policy "user_profiles_own_update"
  on user_profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admin users can read all profiles
create policy "user_profiles_admin_select"
  on user_profiles for select to authenticated
  using (
    exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.tier = 'admin'
    )
  );

-- Admin users can update all profiles
create policy "user_profiles_admin_update"
  on user_profiles for update to authenticated
  using (
    exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.tier = 'admin'
    )
  );

-- Service role has full access
create policy "user_profiles_service_all"
  on user_profiles for all to service_role
  using (true)
  with check (true);

-- =============================================================================
-- Subscription History Table
-- =============================================================================

create table if not exists subscription_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Change details
  previous_tier user_tier,
  new_tier user_tier not null,
  changed_by uuid references auth.users(id),
  change_reason text,

  -- Stripe event data
  stripe_event_id text,
  stripe_subscription_id text,

  created_at timestamptz not null default now()
);

create index if not exists subscription_history_user_idx on subscription_history(user_id);
create index if not exists subscription_history_created_idx on subscription_history(created_at desc);

alter table subscription_history enable row level security;

-- Users can read their own subscription history
create policy "subscription_history_own_select"
  on subscription_history for select to authenticated
  using (auth.uid() = user_id);

-- Admin users can read all subscription history
create policy "subscription_history_admin_select"
  on subscription_history for select to authenticated
  using (
    exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.tier = 'admin'
    )
  );

-- Service role has full access
create policy "subscription_history_service_all"
  on subscription_history for all to service_role
  using (true)
  with check (true);

-- =============================================================================
-- Usage Tracking Table
-- =============================================================================

create table if not exists usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Usage period
  period_start timestamptz not null,
  period_end timestamptz not null,

  -- Usage amounts
  video_minutes_used integer not null default 0,
  ai_requests_used integer not null default 0,
  storage_gb_used numeric(10,2) not null default 0,

  -- Limits during this period
  video_minutes_limit integer not null,
  ai_requests_limit integer not null,
  storage_gb_limit integer not null,

  created_at timestamptz not null default now()
);

create index if not exists usage_tracking_user_idx on usage_tracking(user_id);
create index if not exists usage_tracking_period_idx on usage_tracking(period_start, period_end);

alter table usage_tracking enable row level security;

-- Users can read their own usage history
create policy "usage_tracking_own_select"
  on usage_tracking for select to authenticated
  using (auth.uid() = user_id);

-- Admin users can read all usage history
create policy "usage_tracking_admin_select"
  on usage_tracking for select to authenticated
  using (
    exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.tier = 'admin'
    )
  );

-- Service role has full access
create policy "usage_tracking_service_all"
  on usage_tracking for all to service_role
  using (true)
  with check (true);

-- =============================================================================
-- Trigger Functions
-- =============================================================================

-- Function to update user_profiles.updated_at on changes
create or replace function update_user_profile_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_user_profile_updated_at();

-- Function to create user profile on signup
create or replace function create_user_profile()
returns trigger as $$
begin
  insert into user_profiles (id, email, tier)
  values (
    new.id,
    coalesce(new.email, 'user-' || new.id || '@example.com'),
    'free'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function create_user_profile();

-- Function to log subscription changes
create or replace function log_subscription_change()
returns trigger as $$
begin
  if old.tier is distinct from new.tier then
    insert into subscription_history (
      user_id,
      previous_tier,
      new_tier,
      stripe_subscription_id
    ) values (
      new.id,
      old.tier,
      new.tier,
      new.stripe_subscription_id
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_user_profile_tier_change
  after update on user_profiles
  for each row
  when (old.tier is distinct from new.tier)
  execute function log_subscription_change();

-- Function to reset monthly usage
create or replace function reset_monthly_usage()
returns void as $$
begin
  -- Archive current usage to usage_tracking
  insert into usage_tracking (
    user_id,
    period_start,
    period_end,
    video_minutes_used,
    ai_requests_used,
    storage_gb_used,
    video_minutes_limit,
    ai_requests_limit,
    storage_gb_limit
  )
  select
    id,
    usage_reset_at - interval '1 month',
    usage_reset_at,
    video_minutes_used,
    ai_requests_used,
    storage_gb_used,
    video_minutes_limit,
    ai_requests_limit,
    storage_gb_limit
  from user_profiles
  where usage_reset_at <= now();

  -- Reset usage counters
  update user_profiles
  set
    video_minutes_used = 0,
    ai_requests_used = 0,
    storage_gb_used = 0,
    usage_reset_at = date_trunc('month', now() + interval '1 month')
  where usage_reset_at <= now();
end;
$$ language plpgsql security definer;

-- =============================================================================
-- Helper Functions for Usage Limits
-- =============================================================================

-- Function to update tier limits based on tier
create or replace function update_tier_limits()
returns trigger as $$
begin
  case new.tier
    when 'free' then
      new.video_minutes_limit := 10;
      new.ai_requests_limit := 50;
      new.storage_gb_limit := 5;
    when 'premium' then
      new.video_minutes_limit := 500;
      new.ai_requests_limit := 2000;
      new.storage_gb_limit := 100;
    when 'admin' then
      new.video_minutes_limit := 999999;
      new.ai_requests_limit := 999999;
      new.storage_gb_limit := 1000;
  end case;
  return new;
end;
$$ language plpgsql;

create trigger on_user_profile_tier_change_update_limits
  before insert or update of tier on user_profiles
  for each row
  execute function update_tier_limits();

-- =============================================================================
-- Initialize existing users
-- =============================================================================

-- Create profiles for any existing users who don't have one
insert into user_profiles (id, email, tier)
select
  id,
  coalesce(email, 'user-' || id || '@example.com'),
  'free'
from auth.users
where not exists (
  select 1 from user_profiles where user_profiles.id = auth.users.id
)
on conflict (id) do nothing;

-- =============================================================================
-- End of Migration
-- =============================================================================
