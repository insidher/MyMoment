-- Fix infinite recursion in admin_users RLS policy
-- The original SELECT policy caused recursion by querying admin_users within its own USING clause

-- Drop the problematic policy
DROP POLICY IF EXISTS "Only admins can view admin_users" ON public.admin_users;

-- Recreate with a non-recursive check using auth.users directly
CREATE POLICY "Only admins can view admin_users"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (
        (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
            SELECT user_email FROM public.admin_users
        )
    );
