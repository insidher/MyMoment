-- Temporarily drop the trigger so we can perform the Admin-Only Signup Test
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
