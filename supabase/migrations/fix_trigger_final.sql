-- FINAL FIX: Correct trigger for profiles table with name/image columns
-- Run this in Supabase SQL Editor

-- 1. Recreate the trigger function with correct column names
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, name, image)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'username',
    null
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Clean up orphaned users (run after creating trigger)
DELETE FROM auth.users WHERE email LIKE '%steve%' OR email LIKE '%bob%';
