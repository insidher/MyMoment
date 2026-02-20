-- Migration: Fix Auth Hardening & Profile Creation (v1.1.2 Hotfix)
-- This migration ensures profiles are always created successfully, even with missing metadata.
-- It also prepares the schema for Google Auth and immediate access.

-- 1. Schema Safety: Ensure critical columns exist and are nullable
DO $$ 
BEGIN 
    -- Ensure 'username' exists and is nullable
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;
    END IF;

    -- Ensure 'name' exists and is nullable
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
        ALTER TABLE public.profiles ADD COLUMN name TEXT;
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;
    END IF;

    -- Ensure 'image' exists and is nullable
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'image') THEN
        ALTER TABLE public.profiles ADD COLUMN image TEXT;
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN image DROP NOT NULL;
    END IF;

    -- Ensure legacy/alternate columns are also nullable if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ALTER COLUMN avatar_url DROP NOT NULL;
    END IF;
END $$;


-- 2. Redefine the trigger function with robust fallback logic
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    -- Variables to hold extracted/fallback values
    v_username TEXT;
    v_name TEXT;
    v_image TEXT;
BEGIN
    -- Extract or Generate Username
    -- Priority: metadata.username -> split_part(email, '@', 1)
    v_username := COALESCE(
        new.raw_user_meta_data->>'username',
        split_part(new.email, '@', 1)
    );

    -- Extract or Generate Name
    -- Priority: metadata.name -> metadata.full_name -> split_part(email, '@', 1)
    v_name := COALESCE(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'full_name',
        split_part(new.email, '@', 1)
    );

    -- Extract Image
    -- Priority: metadata.avatar_url -> metadata.image -> NULL
    v_image := COALESCE(
        new.raw_user_meta_data->>'avatar_url', -- Standard for Google Auth
        new.raw_user_meta_data->>'image'
    );

    -- Insert into profiles
    -- Explicitly specifying columns to match current schema
    INSERT INTO public.profiles (id, email, username, name, image)
    VALUES (
        new.id, 
        new.email,
        v_username,
        v_name,
        v_image
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = COALESCE(public.profiles.username, EXCLUDED.username),
        name = COALESCE(public.profiles.name, EXCLUDED.name),
        image = COALESCE(public.profiles.image, EXCLUDED.image);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Clean up any stuck users (Safety measure for dev env)
-- Optional: Uncomment if you want to hard reset bad data
-- DELETE FROM auth.users WHERE email LIKE '%example.com%';
