-- Migration: Fix infinite recursion in admin_users RLS policy (v2)
-- Description: Replaces the recursive self-referencing policy with a clean, open read policy for authenticated users.

-- 1. Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Drop the recursive policies (safely)
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow read access for all users" ON public.admin_users;

-- 3. Create a clean, non-recursive policy (Option A: Open Read for Authenticated)
-- This allows anyone logged in to see the list of admin emails/IDs, which 
-- stops the recursion when this table is used as a lookup for other table policies.
CREATE POLICY "Allow authenticated users to read admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (true);

-- Documentation
COMMENT ON POLICY "Allow authenticated users to read admin_users" ON public.admin_users IS 'Stops infinite recursion by allowing authenticated users to verify admin status without self-referential subqueries.';
