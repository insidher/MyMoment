-- Add group_id to moments table for Peer-to-Peer grouping
ALTER TABLE moments ADD COLUMN group_id UUID DEFAULT NULL;

-- Add index for performance when querying moments by group
CREATE INDEX idx_moments_group_id ON moments(group_id);

-- Optional: Comment explaining the column
COMMENT ON COLUMN moments.group_id IS 'UUID to cluster moments together continuously (Peer-to-Peer). Replaces parent_id for visual grouping.';
