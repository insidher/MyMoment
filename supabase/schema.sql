-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 
-- 1. Profiles Table (Extends auth.users)
--
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Trigger: Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--
-- 2. TrackSource Table (Stores unique tracks/videos to avoid duplication)
--
CREATE TABLE public.track_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL, -- 'youtube', 'spotify', etc.
  source_url TEXT NOT NULL UNIQUE,
  title TEXT,
  artist TEXT,
  artwork TEXT,
  duration_sec INTEGER,
  canonical_track_id TEXT, -- Optional, for future de-duping
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: TrackSource (Publicly readable, created by authenticated users via API/Server)
ALTER TABLE public.track_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Track sources are viewable by everyone" 
ON public.track_sources FOR SELECT 
USING (true);

-- Allow authenticated users to create track sources if they don't exist
CREATE POLICY "Authenticated users can insert track sources" 
ON public.track_sources FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

--
-- 3. Moments Table
--
CREATE TABLE public.moments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Core Logic (User Request Mapping)
  resource_id TEXT, -- Map to 'sourceUrl' or ID extraction? keeping 'resource_id' as requested
  platform TEXT NOT NULL, -- 'youtube', 'spotify'
  
  -- Relational Link to TrackSource (Preserving consistency)
  track_source_id UUID REFERENCES public.track_sources(id), 
  
  -- Playback Data
  start_time FLOAT NOT NULL, -- 'startSec'
  end_time FLOAT NOT NULL,   -- 'endSec'
  
  -- User Content
  note TEXT,
  
  -- Metadata snapshot (optional but useful if track_source is deleted or loose)
  title TEXT,
  artist TEXT,
  artwork TEXT,
  
  -- Social Counts
  like_count INTEGER DEFAULT 0,
  saved_by_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: Moments
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moments are viewable by everyone" 
ON public.moments FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own moments" 
ON public.moments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moments" 
ON public.moments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moments" 
ON public.moments FOR DELETE 
USING (auth.uid() = user_id);

--
-- 4. Likes Table
--
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  moment_id UUID NOT NULL REFERENCES public.moments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, moment_id)
);

-- RLS: Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" 
ON public.likes FOR SELECT 
USING (true);

CREATE POLICY "Users can toggle their own likes" 
ON public.likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.likes FOR DELETE 
USING (auth.uid() = user_id);

-- 
-- 8. Add updated_at to moments
--
ALTER TABLE public.moments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Update existing rows to have updated_at = created_at
UPDATE public.moments 
SET updated_at = created_at 
WHERE updated_at IS NULL;
