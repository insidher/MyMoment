
-- RLS Strategy Documentation

-- 1. All tables must have Row Level Security enabled.
-- 2. Policies should restrict access to auth.uid() for user-specific data.
-- 3. Public data (if any) should have explicit "Enable Read Access for All" policies.

-- Example Policy (Template):
-- create policy "Users can view their own data"
-- on public.your_table
-- for select
-- using (auth.uid() = user_id);
