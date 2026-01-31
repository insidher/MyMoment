-- Fix RLS recursion issue for admin_users table
-- The original policy caused infinite recursion because checking admin status
-- required reading the table, which required being an admin.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Only admins can view admin_users" ON public.admin_users;

-- Create new policy: users can check if THEY are an admin
CREATE POLICY "Users can check their own admin status"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (
        user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
