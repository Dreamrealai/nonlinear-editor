-- =============================================================================
-- Asset Tags and Advanced Metadata
-- =============================================================================
-- Adds tagging system and usage tracking for asset organization

-- Add tags array column to assets table
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add usage_count column to track how many times asset is used in timelines
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;

-- Add last_used_at timestamp
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

-- Add is_favorite boolean for starring assets
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Create index on tags for efficient filtering
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets USING GIN (tags);

-- Create index on is_favorite for quick access to favorites
CREATE INDEX IF NOT EXISTS idx_assets_is_favorite ON assets (is_favorite) WHERE is_favorite = true;

-- Create index on usage_count for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_assets_usage_count ON assets (usage_count DESC);

-- Create index on last_used_at for recent usage queries
CREATE INDEX IF NOT EXISTS idx_assets_last_used_at ON assets (last_used_at DESC);

-- Function to increment asset usage count
CREATE OR REPLACE FUNCTION increment_asset_usage(asset_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE assets
  SET
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = now()
  WHERE id = asset_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_asset_usage TO authenticated;

-- Refresh updated_at trigger for assets (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column if it doesn't exist
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON COLUMN assets.tags IS 'User-defined tags for organizing assets (e.g., intro, outro, b-roll, music)';
COMMENT ON COLUMN assets.usage_count IS 'Number of times this asset has been added to timelines';
COMMENT ON COLUMN assets.last_used_at IS 'Timestamp of most recent usage in a timeline';
COMMENT ON COLUMN assets.is_favorite IS 'Whether user has marked this asset as a favorite';
