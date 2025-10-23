-- =============================================================================
-- Add Export Job Type
-- =============================================================================
-- Adds 'video-export' to the job_type enum for tracking export operations
-- =============================================================================

-- Add export job type to enum
alter type job_type add value if not exists 'video-export';

-- Comment for documentation
comment on type job_type is 'Types of processing jobs: video-generation, video-upscale, video-to-audio, audio-generation, scene-detection, audio-extraction, frame-extraction, frame-edit, video-export';
