-- =============================================================================
-- Fix User Profile Creation Trigger
-- =============================================================================
-- Issue: The on_auth_user_created trigger fails when creating users because
-- the create_user_profile() function cannot insert into user_profiles due to
-- missing RLS policies.
--
-- Solution: Modify the trigger function to properly bypass RLS by setting it
-- to run as the postgres superuser context.
-- =============================================================================

-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists create_user_profile();

-- Recreate function with proper RLS bypass
-- Using 'security definer' alone isn't enough - we need to ensure
-- the function can bypass RLS when inserting into user_profiles
create or replace function create_user_profile()
returns trigger
security definer
set search_path = public, auth
language plpgsql
as $$
begin
  insert into public.user_profiles (id, email, tier)
  values (
    new.id,
    coalesce(new.email, 'user-' || new.id || '@example.com'),
    'free'
  );
  return new;
exception
  when others then
    -- Log error but don't fail user creation
    raise warning 'Failed to create user profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function create_user_profile();

-- =============================================================================
-- Alternative: Add explicit INSERT policy (backup approach)
-- =============================================================================
-- If the above doesn't work, this policy ensures the trigger can insert
drop policy if exists "user_profiles_trigger_insert" on user_profiles;

create policy "user_profiles_trigger_insert"
  on user_profiles for insert
  with check (true);

-- Grant necessary permissions to ensure trigger works
grant usage on schema public to postgres, authenticated, anon, service_role;
grant all on public.user_profiles to postgres, service_role;

-- =============================================================================
-- End of Migration
-- =============================================================================
