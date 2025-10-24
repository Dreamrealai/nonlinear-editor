-- =============================================================================
-- User Onboarding State Migration
-- =============================================================================
-- Adds table for tracking user onboarding progress
-- =============================================================================

-- User Onboarding State Table
create table if not exists user_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tours_completed text[] not null default '{}',
  tours_skipped text[] not null default '{}',
  current_tour_id text,
  current_step_index integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index
create index if not exists user_onboarding_state_user_idx on user_onboarding_state(user_id);

-- RLS Policies
alter table user_onboarding_state enable row level security;

-- Users can only see and manage their own onboarding state
create policy "user_onboarding_state_select"
  on user_onboarding_state for select to authenticated
  using (auth.uid() = user_id);

create policy "user_onboarding_state_insert"
  on user_onboarding_state for insert to authenticated
  with check (auth.uid() = user_id);

create policy "user_onboarding_state_update"
  on user_onboarding_state for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Function to update timestamp
create or replace function update_onboarding_state_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update timestamp
create trigger update_onboarding_state_timestamp_trigger
  before update on user_onboarding_state
  for each row
  execute function update_onboarding_state_timestamp();

-- =============================================================================
-- End of Migration
-- =============================================================================
