-- Add user_name column to existing user_feedback table
ALTER TABLE public.user_feedback 
ADD COLUMN IF NOT EXISTS user_name TEXT;
