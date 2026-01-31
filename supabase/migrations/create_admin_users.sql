-- Create admin_users table for access control
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL,
    granted_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with primary admin
INSERT INTO public.admin_users (user_email, granted_by) 
VALUES ('amir.ilyasov@gmail.com', 'system')
ON CONFLICT (user_email) DO NOTHING;

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view admin_users table
CREATE POLICY "Only admins can view admin_users"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (
        user_email IN (SELECT user_email FROM public.admin_users)
    );

-- Policy: Only admins can insert new admins
CREATE POLICY "Only admins can grant admin access"
    ON public.admin_users FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Add admin policies to user_feedback table
-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
    ON public.user_feedback FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Policy: Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
    ON public.user_feedback FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );
