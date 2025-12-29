-- Add track_duration_sec column to moments table
-- This allows each moment to store track duration directly, eliminating dependency on track_sources

ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS track_duration_sec INTEGER;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_moments_track_duration ON moments(track_duration_sec);

-- Backfill existing moments from track_sources where available
UPDATE moments 
SET track_duration_sec = ts.duration_sec
FROM track_sources ts
WHERE moments.track_source_id = ts.id
  AND moments.track_duration_sec IS NULL
  AND ts.duration_sec IS NOT NULL
  AND ts.duration_sec > 0;

-- Add comment for documentation
COMMENT ON COLUMN moments.track_duration_sec IS 'Duration of the full track in seconds. Denormalized from track_sources for reliability.';
