-- 1. Fix the ID column to ensure it auto-generates UUIDs
-- We use ALTER TABLE because the table already exists but is missing the default
ALTER TABLE public.likes 
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN id SET NOT NULL;

-- 2. Ensure RLS is enabled
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.likes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.likes;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.likes;

-- 4. Re-create policies with robust casting checks

-- Everyone can view likes
CREATE POLICY "Likes are viewable by everyone" 
ON public.likes FOR SELECT 
USING (true);

-- Authenticated users can insert their own likes
CREATE POLICY "Users can insert their own likes" 
ON public.likes FOR INSERT 
TO authenticated 
WITH CHECK ((select auth.uid())::text = user_id::text);

-- Authenticated users can delete their own likes
CREATE POLICY "Users can delete their own likes" 
ON public.likes FOR DELETE 
TO authenticated 
USING ((select auth.uid())::text = user_id::text);
