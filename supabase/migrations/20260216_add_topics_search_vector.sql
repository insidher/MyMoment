-- Migration: Add topics, youtube_category_id, and Full Text Search to track_sources
-- Date: 2026-02-16
-- Purpose: Store cleaned topic categories, explicit YouTube category ID,
--          and enable high-performance full-text search on title + description + tags.

-- ============================================
-- 1. NEW COLUMNS
-- ============================================

-- Cleaned topic categories from topicDetails.topicCategories
-- Stores values like 'Pop_music', 'Entertainment' (not full Wikipedia URLs)
ALTER TABLE track_sources
ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}';

-- Explicit YouTube category ID (mirrors category_id but named unambiguously)
-- e.g. '10' = Music, '22' = People & Blogs, '24' = Entertainment
ALTER TABLE track_sources
ADD COLUMN IF NOT EXISTS youtube_category_id TEXT;

-- ============================================
-- 2. FULL TEXT SEARCH VECTOR (Generated Column)
-- ============================================

-- search_vector combines title (weight A), description (weight B), 
-- and tags (weight C) into a single tsvector for fast searching.
-- Uses a trigger instead of GENERATED ALWAYS because we need to handle
-- the TEXT[] -> text conversion for tags.

ALTER TABLE track_sources
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create the trigger function that builds the search vector
CREATE OR REPLACE FUNCTION track_sources_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trg_track_sources_search_vector ON track_sources;

-- Create the trigger on INSERT and UPDATE
CREATE TRIGGER trg_track_sources_search_vector
    BEFORE INSERT OR UPDATE OF title, description, tags
    ON track_sources
    FOR EACH ROW
    EXECUTE FUNCTION track_sources_search_vector_update();

-- ============================================
-- 3. INDEXES
-- ============================================

-- GIN index for fast full-text search queries
CREATE INDEX IF NOT EXISTS idx_track_sources_search_vector
    ON track_sources USING GIN (search_vector);

-- GIN index for topic array containment queries (e.g. WHERE 'Pop_music' = ANY(topics))
CREATE INDEX IF NOT EXISTS idx_track_sources_topics
    ON track_sources USING GIN (topics);

-- Index on youtube_category_id for filtering by category
CREATE INDEX IF NOT EXISTS idx_track_sources_youtube_category_id
    ON track_sources (youtube_category_id);

-- ============================================
-- 4. BACKFILL search_vector for existing rows
-- ============================================

UPDATE track_sources SET
    search_vector =
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C')
WHERE search_vector IS NULL AND (title IS NOT NULL OR description IS NOT NULL);

-- Backfill youtube_category_id from existing category_id column
UPDATE track_sources SET
    youtube_category_id = category_id
WHERE youtube_category_id IS NULL AND category_id IS NOT NULL;

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON COLUMN track_sources.topics IS 'Cleaned topic categories from YouTube topicDetails (e.g. Pop_music, Entertainment)';
COMMENT ON COLUMN track_sources.youtube_category_id IS 'YouTube Data API categoryId (e.g. 10=Music, 22=People & Blogs)';
COMMENT ON COLUMN track_sources.search_vector IS 'Auto-generated tsvector for full-text search on title(A), description(B), tags(C)';
