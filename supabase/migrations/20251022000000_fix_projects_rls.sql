-- Fix RLS policy for projects table to allow INSERT operations
-- The previous policy was blocking INSERT because it had a USING clause
-- that checked auth.uid() = user_id before the row existed

-- Drop the old policy that was preventing INSERTs
drop policy if exists "projects_owner_mod" on projects;

-- Create separate policies for each operation
create policy "projects_owner_insert"
  on projects for insert to authenticated
  with check (auth.uid() = user_id);

create policy "projects_owner_update"
  on projects for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_owner_delete"
  on projects for delete to authenticated
  using (auth.uid() = user_id);
