-- Add user_activity_history table for tracking AI generations and uploads
CREATE TABLE IF NOT EXISTS user_activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Activity metadata
  activity_type TEXT NOT NULL CHECK (activity_type IN ('video_generation', 'audio_generation', 'image_upload', 'video_upload', 'audio_upload', 'frame_edit', 'video_upscale')),

  -- Details about the activity
  title TEXT,                         -- e.g. prompt for generation, filename for upload
  description TEXT,                   -- Additional context
  model TEXT,                         -- AI model used (for generations)
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- Metadata stored as JSONB for flexibility
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for efficient queries
  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'video_generation',
    'audio_generation',
    'image_upload',
    'video_upload',
    'audio_upload',
    'frame_edit',
    'video_upscale'
  ))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_activity_history_user_id ON user_activity_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_history_created_at ON user_activity_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_history_activity_type ON user_activity_history(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_history_user_created ON user_activity_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_activity_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own activity history
CREATE POLICY "Users can view their own activity history"
  ON user_activity_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own activity history
CREATE POLICY "Users can insert their own activity history"
  ON user_activity_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own activity history
CREATE POLICY "Users can delete their own activity history"
  ON user_activity_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE user_activity_history IS 'Tracks user activity including AI generations and file uploads for display in user profile history';
COMMENT ON COLUMN user_activity_history.activity_type IS 'Type of activity: video_generation, audio_generation, image_upload, video_upload, audio_upload, frame_edit, video_upscale';
COMMENT ON COLUMN user_activity_history.metadata IS 'Flexible JSONB field for storing activity-specific data like duration, resolution, file size, etc.';
