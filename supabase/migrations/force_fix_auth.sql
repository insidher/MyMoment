-- FORCE FIX AUTH TRIGGER
-- Run this ENTIRE block in Supabase SQL Editor

-- 1. Drop EVERYTHING related to this trigger to ensure no stale state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recreate Function with Defensive Logic
-- CRITICAL: We insert into 'name' (EXISTENT), and handle metadata safely
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  extracted_name text;
  extracted_image text;
BEGIN
  -- Extract with checks - prioritize 'name', fallback to 'full_name'
  extracted_name := COALESCE(
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'full_name', 
    'New User'
  );
  
  extracted_image := new.raw_user_meta_data->>'avatar_url';
  
  -- Insert into the CORRECT columns: id, email, name, image
  INSERT INTO public.profiles (id, email, name, image)
  VALUES (
    new.id, 
    new.email,
    extracted_name,
    extracted_image
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Verification Message
SELECT 'Trigger and Function forcefully recreated.' as status;
