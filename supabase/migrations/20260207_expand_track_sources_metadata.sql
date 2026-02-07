-- Migration: Expand track_sources with Enriched YouTube Metadata
-- Description: Adds columns for detailed YouTube metadata to support search and caching.

ALTER TABLE track_sources 
ADD COLUMN IF NOT EXISTS youtube_video_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS channel_title TEXT,
ADD COLUMN IF NOT EXISTS view_count BIGINT,
ADD COLUMN IF NOT EXISTS category_id TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS metadata_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for fast lookups by video_id
CREATE INDEX IF NOT EXISTS idx_track_sources_youtube_video_id ON track_sources(youtube_video_id);

-- Add comment for documentation
COMMENT ON TABLE track_sources IS 'Stores global reference data for tracks/videos to cache external API metadata.';
