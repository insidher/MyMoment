-- Change category_id from TEXT to INTEGER
-- Using USING to cast existing data
-- This is safe because we verified all data is numeric or null

ALTER TABLE track_sources 
ALTER COLUMN category_id TYPE integer 
USING category_id::integer;
