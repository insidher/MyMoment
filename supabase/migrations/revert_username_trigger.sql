-- Migration: Revert username support and fix profiles trigger
-- This reverts the changes from add_username_support.sql and ensures proper profile creation

-- 1. Ensure username is nullable (just in case it was made NOT NULL)
-- This prevents errors if we insert without a username
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;
    END IF;
END $$;

-- 2. Create or replace the handle_new_user function to use 'name' instead of 'username'
-- IMPORTANT: The table uses 'name' and 'image', NOT 'full_name' or 'avatar_url'
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, image)
  VALUES (
    new.id, 
    new.email,
    -- Prioritize 'name' from metadata, fallback to 'full_name'
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
