# Non-Linear Video Editor - Comprehensive Feature Inventory

## Overview

This document provides a complete inventory of all features and functionality in the non-linear video editor codebase, organized by category with specific file locations for testing.

---

## 1. CORE EDITING FEATURES

### 1.1 Timeline Management

**Description:** Central timeline that manages video clips, audio tracks, transitions, and overlays

**Key Files:**

- **State Management:** `/state/useTimelineStore.ts`
- **Types:** `/types/timeline.ts`
- **Components:**
  - `/components/timeline/TimelineClipRenderer.tsx` - Renders clips on timeline
  - `/components/timeline/TimelineTracks.tsx` - Track management UI
  - `/components/timeline/TimelinePlayhead.tsx` - Current playback position indicator
  - `/components/timeline/TimelineRuler.tsx` - Time ruler with markers
  - `/components/timeline/TimelineMarkers.tsx` - Marker management
  - `/components/timeline/TimelineMinimap.tsx` - Minimap preview

**Testable Features:**

- Add clips to timeline
- Remove clips from timeline
- Reorder clips on timeline
- Change clip duration (trim/extend)
- Multi-track support (video, audio)
- Clip grouping and organization
- Timeline zoom (min: 0.1x, max: 10x)
- Playhead scrubbing
- Grid snapping
- Timeline markers/bookmarks
- Guide lines (vertical/horizontal)
- Track muting and solo functionality
- Track locking

**Related Services:**

- `/lib/services/projectService.ts` - Project state persistence
- `/lib/hooks/useTimelineCalculations.ts` - Timeline math utilities
- `/lib/utils/timelineUtils.ts` - Timeline manipulation utilities

---

### 1.2 Clip Editing Operations

**Description:** Basic editing operations on clips (cut, trim, split, merge)

**Key Files:**

- **State Store:** `/state/useTimelineStore.ts`
- **Components:**
  - `/components/editor/ClipPropertiesPanel.tsx` - Clip property editor
  - `/components/timeline/TimelineTrimOverlay.tsx` - Visual trim interface
  - `/components/timeline/TimelineContextMenu.tsx` - Right-click clip menu
  - `/components/timeline/EditModeFeedback.tsx` - Edit mode indicator

**Testable Features:**

- Trim clip start/end points
- Split clip at specific time
- Cut clip segment
- Paste clip in timeline
- Copy clip properties
- Duplicate clip
- Delete clip
- Lock/unlock individual clips
- Clip color labeling
- Clip grouping

**Related Utilities:**

- `/lib/hooks/useAdvancedTrimming.ts` - Advanced trimming operations
- `/lib/utils/cloneUtils.ts` - Clip cloning functionality

---

### 1.3 Clip Properties & Effects

**Description:** Video, audio, and transform effects on clips

**Video Effects:**

- **Brightness:** 0-200% (default 100%)
- **Contrast:** 0-200% (default 100%)
- **Saturation:** 0-200% (default 100%)
- **Hue:** 0-360° rotation (default 0°)
- **Blur:** 0-20 pixels (default 0)

**Transform Effects:**

- **Rotation:** 0-360°
- **Horizontal Flip:** boolean
- **Vertical Flip:** boolean
- **Scale:** 0.1x - 3x (default 1.0)

**Audio Effects:**

- **Volume:** -60 to +12 dB (default 0)
- **Mute:** On/off toggle
- **Fade In:** Duration in seconds
- **Fade Out:** Duration in seconds
- **3-Band EQ:**
  - Bass Gain: -12 to +12 dB (100-400 Hz)
  - Mid Gain: -12 to +12 dB (400-4000 Hz)
  - Treble Gain: -12 to +12 dB (4000+ Hz)
- **Compression:** 0-100 (0 = none, 100 = heavy)
- **Normalization:** Auto-normalize to -3dB peak

**Clip Properties:**

- **Speed:** 0.25x - 4x playback speed
- **Opacity:** 0-100%
- **Crop:** Custom rectangular crop region
- **Volume:** 0-200%
- **Mute:** On/off toggle

**Key Files:**

- **Types:** `/types/timeline.ts` (VideoEffects, AudioEffects, Transform, Clip)
- **Components:**
  - `/components/editor/corrections/VideoEffectsSection.tsx` - Video effects UI
  - `/components/editor/corrections/AudioEffectsSection.tsx` - Audio effects UI
  - `/components/editor/corrections/TransformSection.tsx` - Transform controls
  - `/components/editor/corrections/ColorCorrectionSection.tsx` - Color correction
  - `/components/editor/ClipPropertiesPanel.tsx` - Properties panel
  - `/components/editor/TimelineCorrectionsMenu.tsx` - Effects menu
- **Hooks:**
  - `/lib/hooks/useAudioEffects.ts` - Audio effects management
  - `/components/editor/corrections/useCorrectionHandlers.ts` - Effects handlers
  - `/components/editor/corrections/useCorrectionSync.ts` - Effects sync

**Testable Features:**

- Apply video effects to clips
- Apply audio effects to clips
- Apply transform effects to clips
- Adjust effect parameters
- Reset effects to defaults
- Save effect presets
- Load effect presets

---

### 1.4 Transitions

**Description:** Transitions between clips

**Supported Transition Types:**

1. **Fade Transitions:**
   - fade-in
   - fade-out
   - crossfade

2. **Slide Transitions:**
   - slide-left
   - slide-right
   - slide-up
   - slide-down

3. **Wipe Transitions:**
   - wipe-left
   - wipe-right

4. **Zoom Transitions:**
   - zoom-in
   - zoom-out

5. **None:** No transition

**Transition Properties:**

- Duration (configurable in seconds)
- Type selection
- Per-clip configuration

**Key Files:**

- **Types:** `/types/timeline.ts` (TransitionType)
- **State:** `/state/useTimelineStore.ts` (addTransitionToClips)
- **UI:** `/components/editor/ClipPropertiesPanel.tsx`

**Testable Features:**

- Add transition between clips
- Change transition type
- Adjust transition duration
- Remove transition
- Preview transition effect

---

### 1.5 Text Overlays & Captions

**Description:** Add text overlays with animations and styling

**Text Overlay Properties:**

- **Position:** X, Y (0-100% of video)
- **Font Size:** Pixels
- **Color:** Hex color code
- **Background Color:** With transparency
- **Font Family:** serif/sans-serif options
- **Alignment:** left, center, right
- **Opacity:** 0-100%
- **Duration:** Start time and length

**Text Animations:**

- **Animation Types:** 19 different animation types
  - fade-in, fade-out, fade-in-out
  - slide-in-left, slide-in-right, slide-in-top, slide-in-bottom
  - slide-out-left, slide-out-right, slide-out-top, slide-out-bottom
  - scale-in, scale-out, scale-pulse
  - rotate-in, rotate-out
  - bounce-in
  - typewriter

- **Animation Properties:**
  - Duration: configurable seconds
  - Delay: start delay
  - Easing: linear, ease-in/out, cubic, bounce, etc.
  - Repeat: number of times or infinite
  - Direction: normal, reverse, alternate, alternate-reverse

**Key Files:**

- **Types:** `/types/timeline.ts` (TextOverlay, TextAnimation)
- **Components:**
  - `/components/TextOverlayEditor.tsx` - Text editor UI
  - `/components/TextOverlayRenderer.tsx` - Text renderer
  - `/components/timeline/TimelineTextOverlayRenderer.tsx` - Timeline text display
  - `/components/timeline/TimelineTextOverlayTrack.tsx` - Text overlay track
- **State:** `/state/useTimelineStore.ts` (addTextOverlay, updateTextOverlay, removeTextOverlay)
- **Utilities:** `/lib/utils/textAnimations.ts` - Animation utilities

**Testable Features:**

- Add text overlay to timeline
- Edit text content
- Change position (x, y)
- Change font size, color, background
- Apply text animation
- Configure animation properties
- Preview text animation
- Remove text overlay
- Multiple overlays on same timeline

---

### 1.6 Playback Controls

**Description:** Video playback and preview functionality

**Key Files:**

- **State Store:** `/state/usePlaybackStore.ts`
- **Components:**
  - `/components/preview/PlaybackControls.tsx` - Control buttons
  - `/components/AudioWaveform.tsx` - Waveform visualization
  - `/components/LastSavedIndicator.tsx` - Save status indicator
- **Hooks:**
  - `/lib/hooks/useVideoPlayback.ts` - Playback engine
  - `/lib/hooks/usePolling.ts` - Status polling for async operations

**Testable Features:**

- Play/pause video
- Seek to specific time (scrub)
- Change playback speed (0.25x, 0.5x, 1x, 1.5x, 2x)
- Volume control (0-100%)
- Mute/unmute
- Full-screen preview
- Timeline preview on hover
- Playhead position tracking
- Current time display
- Total duration display

**Playback Store Properties:**

- `currentTime: number` - Current playback position
- `zoom: number` - Timeline zoom level (0.1-10x)
- `isPlaying: boolean` - Playback state

---

### 1.7 Selection & Multi-Selection

**Description:** Selecting and managing multiple clips

**Key Files:**

- **State Store:** `/state/useSelectionStore.ts`
- **Components:**
  - `/components/timeline/TimelineSelectionRectangle.tsx` - Rubber-band selection
  - `/components/timeline/TimelineContextMenu.tsx` - Selection context menu
- **Hooks:**
  - `/lib/hooks/useRubberBandSelection.ts` - Drag-to-select
  - `/components/keyframes/hooks/useKeyframeSelection.ts` - Keyframe selection

**Testable Features:**

- Click to select single clip
- Ctrl/Cmd+click to multi-select
- Drag to select multiple clips (rubber-band)
- Shift+click to select range
- Select all (Ctrl+A)
- Deselect all
- Invert selection
- Select by type (video/audio)
- Group selected clips
- Operations on selected clips (delete, copy, lock, color)

---

## 2. PROJECT MANAGEMENT

### 2.1 Project Creation & Management

**Description:** Create, open, save, and delete projects

**Key Files:**

- **API Routes:**
  - `/app/api/projects/route.ts` - List, create projects
  - `/app/api/projects/[projectId]/route.ts` - Get, update, delete project
- **Service Layer:** `/lib/services/projectService.ts`
- **Components:**
  - `/components/ProjectList.tsx` - List all projects
  - `/components/CreateProjectButton.tsx` - New project creation
- **Database:** Projects table in schema
- **Types:** `/types/timeline.ts` (Timeline)

**Testable Features:**

- Create new project
- List user's projects
- Rename project
- Delete project
- Duplicate project
- Project metadata (created_at, updated_at)
- Project search/filter
- Sort projects by date, name
- Open project in editor

**Project Properties:**

- **Title:** Project name
- **User ID:** Owner
- **Timeline State:** JSON blob with full timeline data
- **Created At:** Timestamp
- **Updated At:** Timestamp

---

### 2.2 Save & Load Operations

**Description:** Persist and restore project state

**Key Files:**

- **Save/Load Engine:** `/lib/saveLoad.ts`
- **Hooks:**
  - `/lib/hooks/useAutosave.ts` - Auto-save functionality
  - `/lib/hooks/useAutoBackup.ts` - Auto-backup functionality
- **Services:**
  - `/lib/services/projectService.ts` - Project persistence
  - `/lib/services/backupService.ts` - Backup management
- **Database:** Projects and timelines tables

**Testable Features:**

- Save project manually
- Auto-save on changes (configurable interval)
- Auto-backup at regular intervals
- Load project from database
- Handle network errors gracefully
- Display save status indicator
- Recover from failed save
- Clear auto-save history

**Related Components:**

- `/components/LastSavedIndicator.tsx` - Shows save status

---

### 2.3 Project Import/Export

**Description:** Export projects to files and import from files

**Key Files:**

- **Export/Import Utils:** `/lib/utils/projectExportImport.ts`
- **Export Formats:**
  - **JSON:** Full project export for import
  - **EDL:** Edit Decision List format (DaVinci Resolve)
  - **FCPXML:** Final Cut Pro XML format
- **Utilities:**
  - `/lib/utils/davinciExport.ts` - DaVinci export
- **Components:**
  - `/components/ProjectExportImport.tsx` - Export/import UI

**Testable Features:**

- Export project to JSON
- Export project to EDL format
- Export project to FCPXML format
- Import project from JSON file
- Validate imported project
- Handle version compatibility

**Export Formats:**

```typescript
interface ExportedProject {
  version: string;
  projectId: string;
  title: string;
  timeline: Timeline;
  assets: AssetRow[];
  exportedAt: string;
}
```

---

### 2.4 Version Control & History

**Description:** Undo/redo functionality for edits

**Key Files:**

- **State Store:** `/state/useHistoryStore.ts`
- **Hooks:** `/lib/hooks/useTimelineKeyboardShortcuts.ts` (Ctrl+Z, Ctrl+Shift+Z)
- **Editor Store:** `/state/useEditorStore.ts` (includes history slice)

**History Stack:**

- **Max History:** 50 actions (configurable via EDITOR_CONSTANTS)
- **Debounce:** 300ms debounce per clip to prevent history spam
- **Actions Tracked:** Clip add/remove, position change, property change, etc.

**Testable Features:**

- Undo last action
- Redo last undone action
- Clear history
- View history size
- Multiple sequential undo/redo
- History with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

---

### 2.5 Project Collaborators & Sharing

**Description:** Share projects with other users

**Key Files:**

- **API Routes:**
  - `/app/api/projects/[projectId]/invites/route.ts` - Send invites
  - `/app/api/projects/[projectId]/collaborators/route.ts` - Manage collaborators
  - `/app/api/projects/[projectId]/share-links/route.ts` - Create share links
  - `/app/api/join/[token]/route.ts` - Join via invite link
- **Database:** Invites and collaborators tables (in schema)

**Testable Features:**

- Invite collaborator via email
- Accept project invitation
- Remove collaborator
- Change collaborator permissions
- Generate share link
- List project collaborators
- View pending invitations

---

### 2.6 Activity History

**Description:** Track project changes and activity

**Key Files:**

- **API Route:** `/app/api/projects/[projectId]/activity/route.ts`
- **Components:** `/components/ActivityHistory.tsx` - Activity log UI
- **Database:** Activity tracking tables (if implemented)

**Testable Features:**

- View activity log
- Filter activity by type
- Filter activity by user
- View timestamps
- View change details

---

### 2.7 Project Backup & Recovery

**Description:** Backup projects and restore from backups

**Key Files:**

- **API Routes:**
  - `/app/api/projects/[projectId]/backups/route.ts` - List and create backups
  - `/app/api/projects/[projectId]/backups/[backupId]/route.ts` - Get backup details
  - `/app/api/projects/[projectId]/backups/[backupId]/restore/route.ts` - Restore backup
- **Service:** `/lib/services/backupService.ts`
- **Component:** `/components/ProjectBackupManager.tsx`

**Testable Features:**

- Create manual backup
- Auto-backup on schedule
- List available backups
- Restore from backup
- Delete backup
- View backup timestamp
- View backup size

---

## 3. ASSET PIPELINE

### 3.1 Asset Upload

**Description:** Upload video, audio, and image files

**Key Files:**

- **API Routes:**
  - `/app/api/assets/route.ts` - List assets
  - `/app/api/assets/upload/route.ts` - Upload asset
  - `/app/api/assets/sign/route.ts` - Generate signed URLs
- **Service:** `/lib/services/assetService.ts`
- **Hooks:**
  - `/lib/hooks/useAssetUpload.ts` - Upload management
  - `/lib/hooks/useAssetList.ts` - Asset listing with pagination
- **Components:**
  - `/components/editor/AssetPanel.tsx` - Asset library UI
  - `/components/ui/DragDropZone.tsx` - Drag-and-drop upload
- **Database:** Assets table with storage_url, metadata, type

**Supported Formats:**

- **Video:** MP4, WebM, QuickTime (.mov), AVI
- **Audio:** MP3, WAV, OGG, M4A
- **Image:** JPEG, PNG, WebP, GIF

**File Size Limits:**

- **Assets:** 500 MB max
- **Frames:** 50 MB max
- **Frame Edits:** 100 MB max

**Testable Features:**

- Upload video file
- Upload audio file
- Upload image file
- Drag-and-drop upload
- Progress indicator during upload
- Error handling for invalid files
- File validation
- Storage URL generation
- Multiple file upload
- Cancel upload in progress

---

### 3.2 Asset Library & Organization

**Description:** Browse, search, filter, and organize assets

**Key Files:**

- **API Route:** `/app/api/assets/route.ts`
- **Components:**
  - `/components/editor/AssetPanel.tsx` - Full asset library UI
  - `/components/editor/AssetCard.tsx` - Individual asset card
  - `/components/generation/AssetLibraryModal.tsx` - Asset library modal
- **Hooks:**
  - `/lib/hooks/useAssetList.ts` - Asset list with pagination
  - `/lib/hooks/useAssetThumbnails.ts` - Thumbnail loading
- **Types:** `/types/assets.ts` (AssetRow, AssetMetadata)

**Asset Properties:**

- **Title:** User-defined name
- **Type:** video, audio, image
- **Storage URL:** Cloud storage path
- **Duration:** For video/audio (seconds)
- **Metadata:** Custom JSON metadata
- **Created At:** Upload timestamp
- **Tags:** User-defined tags for organization
- **Is Favorite:** Boolean flag
- **Usage Count:** Number of timeline uses
- **Last Used At:** Last timeline usage date

**Library Features:**

- **Search:** By title or metadata
- **Filter:** By type (video/audio/image)
- **Filter:** By usage (used/unused)
- **Sort:** By name, date, size, type
- **Pagination:** Browse large libraries
- **Favorites:** Mark frequently used assets
- **Tags:** Organize with custom tags
- **Favorites view:** Show only favorited assets

**Testable Features:**

- Search assets by name
- Filter by type
- Filter by usage
- Sort by date (newest/oldest)
- Sort by name (a-z)
- Sort by size
- Mark as favorite
- Add tags to asset
- Delete asset
- Rename asset
- View asset metadata
- Copy asset storage URL
- Pagination controls (next/previous page)

---

### 3.3 Thumbnail Generation

**Description:** Generate thumbnails for video/audio assets

**Key Files:**

- **API Route:** `/app/api/assets/[assetId]/thumbnail/route.ts`
- **Service:** `/lib/services/thumbnailService.ts`
- **Components:**
  - `/components/editor/AssetCard.tsx` - Shows thumbnail
- **Database:** Thumbnails stored in 'frames' bucket

**Testable Features:**

- Auto-generate thumbnail on upload
- Extract frame at specific time
- Regenerate thumbnail
- Display thumbnail in library
- Use thumbnail in timeline preview
- Handle missing thumbnails gracefully

---

### 3.4 Asset Versioning

**Description:** Track and manage different versions of assets

**Key Files:**

- **API Routes:**
  - `/app/api/assets/[assetId]/versions/route.ts` - List versions
  - `/app/api/assets/[assetId]/versions/[versionId]/revert/route.ts` - Restore version
- **Service:** `/lib/services/assetVersionService.ts`
- **Components:**
  - `/components/editor/AssetVersionHistory.tsx` - Version history UI

**Testable Features:**

- View asset version history
- Compare versions
- Revert to previous version
- Delete version
- Version timestamp tracking

---

### 3.5 Asset Tagging & Metadata

**Description:** Organize assets with tags and custom metadata

**Key Files:**

- **API Route:** `/app/api/assets/[assetId]/tags/route.ts`
- **Components:** `/components/editor/AssetPanel.tsx`
- **Database:** Asset metadata JSONB field

**Testable Features:**

- Add tags to asset
- Remove tags from asset
- Filter by tag
- View all tags
- Edit metadata
- View metadata in asset card

---

### 3.6 Asset Optimization

**Description:** Optimize assets for faster playback

**Key Files:**

- **Service:** `/lib/services/assetOptimizationService.ts`
- **Database:** Asset optimization status tracking

**Testable Features:**

- Auto-compress video
- Auto-optimize audio
- Check optimization status
- View file size reduction

---

## 4. MEDIA GENERATION

### 4.1 Video Generation

**Description:** Generate videos from prompts using AI

**Key Files:**

- **API Routes:**
  - `/app/api/video/generate/route.ts` - Generate video
  - `/app/api/video/status/route.ts` - Check status
- **Components:**
  - `/components/generation/GenerateVideoTab.tsx` - Video generation UI
  - `/components/generation/VideoGenerationForm.tsx` - Generation form
  - `/components/generation/VideoGenerationQueue.tsx` - Queue management
  - `/components/generation/VideoGenerationSettings.tsx` - Settings
  - `/components/generation/VideoQueueItem.tsx` - Queue item display
- **Hooks:**
  - `/lib/hooks/useVideoGeneration.ts` - Generation management
  - `/lib/hooks/useVideoGenerationQueue.ts` - Queue state
  - `/lib/hooks/useGenerationDashboard.ts` - Dashboard logic
- **Modal:** `/app/editor/[projectId]/VideoGenerationModal.tsx`
- **Utilities:** `/lib/utils/videoGenerationUtils.ts`

**Supported Video Providers:**

- Runway ML
- Replicate
- Hugging Face
- Custom providers

**Testable Features:**

- Enter video prompt
- Select generation settings
- Queue video generation job
- Check generation status
- Retrieve generated video
- Handle generation errors
- Cancel generation job
- View generation history
- Retry failed generation
- Batch generation

**Generation Parameters:**

- **Prompt:** Text description
- **Duration:** Video length (15-120 seconds)
- **Aspect Ratio:** 16:9, 9:16, 1:1, etc.
- **Model:** Different AI models available
- **Seed:** For reproducibility (optional)

---

### 4.2 Image Generation

**Description:** Generate images from prompts using AI

**Key Files:**

- **API Route:** `/app/api/image/generate/route.ts`
- **Components:**
  - `/components/generation/GenerateImageTab.tsx` - Image generation UI
- **Models:** Google Imagen, DALL-E, Stable Diffusion

**Testable Features:**

- Enter image prompt
- Generate image from prompt
- View generated image
- Download generated image
- Add to project assets
- Adjust generation parameters
- Batch generation

**Generation Parameters:**

- **Prompt:** Text description
- **Negative Prompt:** What to exclude (optional)
- **Aspect Ratio:** 1:1, 3:2, 16:9, etc.
- **Model:** Different AI models
- **Quality:** Low, medium, high

---

### 4.3 Audio Generation

**Description:** Generate music and voice audio using AI

**Key Files:**

- **API Routes:**
  - `/app/api/audio/suno/generate/route.ts` - Suno music generation
  - `/app/api/audio/elevenlabs/generate/route.ts` - ElevenLabs voice generation
  - `/app/api/audio/elevenlabs/sfx/route.ts` - Sound effects generation
  - `/app/api/audio/elevenlabs/voices/route.ts` - Voice list
- **Components:**
  - `/components/generation/GenerateAudioTab.tsx` - Audio generation UI
  - `/components/generation/audio-generation/AudioTypeSelector.tsx` - Type selector
  - `/components/generation/audio-generation/MusicGenerationForm.tsx` - Music form
  - `/components/generation/audio-generation/VoiceGenerationForm.tsx` - Voice form
  - `/components/generation/audio-generation/SFXGenerationForm.tsx` - SFX form
  - `/components/generation/audio-generation/VoiceSelector.tsx` - Voice picker
- **Hooks:** `/components/generation/audio-generation/useAudioGeneration.ts`
- **Modal:** `/app/editor/[projectId]/AudioGenerationModal.tsx`
- **Service:** `/lib/services/audioService.ts`

**Audio Types:**

1. **Music Generation (Suno):**
   - Prompt-based music generation
   - Customizable genre, mood, duration
   - Multiple voice options

2. **Voice Generation (ElevenLabs):**
   - Text-to-speech conversion
   - Multiple realistic voices
   - Language support
   - Emotion/style control

3. **Sound Effects (ElevenLabs):**
   - Generate SFX from descriptions
   - Realistic sound effects library
   - Adjustable duration

**Testable Features:**

- Generate music from prompt
- Generate voice from text
- Generate sound effects
- Select voice (for voice generation)
- Adjust generation parameters
- Preview generated audio
- Download generated audio
- Add to project assets
- Check generation status
- Handle generation errors

---

### 4.4 Video Upscaling

**Description:** Upscale video quality using AI

**Key Files:**

- **API Routes:**
  - `/app/api/video/upscale/route.ts` - Start upscaling
  - `/app/api/video/upscale-status/route.ts` - Check status
- **Service:** `/lib/services/videoService.ts`

**Testable Features:**

- Select video to upscale
- Choose upscale resolution (2x, 4x)
- Start upscaling job
- Check upscaling status
- Download upscaled video
- Handle errors

---

### 4.5 Video Processing

**Description:** Extract and process video content

**Key Files:**

- **API Routes:**
  - `/app/api/video/split-scenes/route.ts` - Scene detection
  - `/app/api/video/split-audio/route.ts` - Extract audio from video
  - `/app/api/video/generate-audio/route.ts` - Generate audio track
  - `/app/api/video/generate-audio-status/route.ts` - Check status
- **Hooks:**
  - `/lib/hooks/useSceneDetection.ts` - Scene detection logic
  - `/lib/hooks/useVideoManager.ts` - Video management

**Testable Features:**

- Detect scenes in video
- Extract audio from video
- Generate audio description
- Split video by scene
- View detected scenes

---

## 5. KEYFRAME EDITOR

**Description:** Edit keyframes extracted from video scenes

**Key Files:**

- **Page:** `/app/editor/[projectId]/keyframe/page.tsx`
- **Components:**
  - `/components/keyframes/KeyframeEditorShell.tsx` - Main editor UI
  - `/components/keyframes/components/KeyframePreview.tsx` - Preview
  - `/components/keyframes/components/KeyframeSidebar.tsx` - Sidebar
  - `/components/keyframes/components/EditControls.tsx` - Edit buttons
  - `/components/keyframes/components/VersionsGallery.tsx` - Version gallery
- **Hooks:**
  - `/components/keyframes/hooks/useFramesData.ts` - Load frames
  - `/components/keyframes/hooks/useImageUpload.ts` - Upload edited frame
  - `/components/keyframes/hooks/useKeyframeEditing.ts` - Edit operations
  - `/components/keyframes/hooks/useKeyframeSelection.ts` - Frame selection
- **API Routes:**
  - `/app/api/frames/[frameId]/edit/route.ts` - Save frame edits
- **Database:** scene_frames, frame_edits tables

**Testable Features:**

- View extracted keyframes from video
- Edit keyframe (crop, enhance, paint)
- Upload edited image
- Save edit as new version
- View edit history
- Revert to original frame
- Delete edit
- Compare versions
- Generate variations using AI

---

## 6. EXPORT & RENDERING

### 6.1 Export to Video File

**Description:** Render timeline to video file

**Key Files:**

- **API Route:** `/app/api/export/route.ts`
- **Components:** `/components/ExportModal.tsx` - Export dialog
- **Hooks:** `/lib/hooks/useVideoManager.ts`

**Export Formats:**

- MP4 (H.264)
- WebM (VP8/VP9)
- (Extensible for MOV, AVI with worker integration)

**Testable Features:**

- Render timeline to video
- Choose export format
- Select output resolution
- Configure bitrate
- Add metadata
- Track export progress
- Download exported video
- Handle rendering errors

**Export Parameters:**

- Width: 1280-4096px
- Height: 720-4320px
- FPS: 24, 25, 30, 60
- Video Bitrate: 1000-50000 Kbps
- Audio Bitrate: 64-320 Kbps

---

### 6.2 Export Presets

**Description:** Save and manage export presets

**Key Files:**

- **API Routes:**
  - `/app/api/export-presets/route.ts` - List and create presets
  - `/app/api/export-presets/[presetId]/route.ts` - Get, update, delete preset
- **Types:** `/types/export.ts` (ExportPreset, PLATFORM_PRESETS)
- **Database:** Export presets table

**Platform Presets:**

- YouTube 1080p (1920x1080, 30fps, 8000 Kbps)
- YouTube 4K (3840x2160, 60fps, 35000 Kbps)
- YouTube Shorts (1080x1920, 30fps, 5000 Kbps)
- Instagram Feed (1080x1080, 30fps)
- Instagram Story (1080x1920, 30fps)
- Instagram Reel (1080x1920, 30fps)
- TikTok (1080x1920, 30fps)
- Twitter (1280x720, 30fps)
- Facebook (1920x1080, 30fps)
- LinkedIn (1920x1080, 30fps)

**Testable Features:**

- Create custom preset
- Load platform preset
- List all presets
- Update preset settings
- Delete preset
- Rename preset
- Set as default
- Apply preset to export

---

### 6.3 Export Queue Management

**Description:** Queue and manage export jobs

**Key Files:**

- **API Routes:**
  - `/app/api/export/queue/route.ts` - List queue
  - `/app/api/export/queue/[jobId]/route.ts` - Get job details
  - `/app/api/export/queue/[jobId]/pause/route.ts` - Pause job
  - `/app/api/export/queue/[jobId]/resume/route.ts` - Resume job
  - `/app/api/export/queue/[jobId]/priority/route.ts` - Change priority
- **Components:** `/components/generation/VideoGenerationQueue.tsx`

**Testable Features:**

- View export queue
- Check job status
- Pause export job
- Resume paused job
- Cancel export job
- Change job priority
- View job progress
- Download completed exports
- View export history

---

## 7. USER INTERFACE

### 7.1 Editor Layout

**Description:** Main editor interface components and layout

**Key Files:**

- **Page:** `/app/editor/[projectId]/page.tsx`
- **Timeline Page:** `/app/editor/[projectId]/timeline/page.tsx`
- **Client Component:** `/app/editor/[projectId]/BrowserEditorClient.tsx`
- **Components:**
  - `/components/EditorHeader.tsx` - Top navigation
  - `/components/preview/PlaybackControls.tsx` - Playback buttons
  - `/components/editor/ResizableAssetPanel.tsx` - Asset library panel
  - `/components/editor/ClipPropertiesPanel.tsx` - Properties panel
  - `/components/editor/ChatBox.tsx` - AI assistant chat

**Layout Structure:**

1. **Header:** Project name, tabs, settings
2. **Timeline Area:**
   - Video preview/player
   - Timeline with clips and tracks
   - Playback controls
3. **Side Panels:**
   - Asset library (left/right resizable)
   - Clip properties (right side)
4. **Toolbars:**
   - Playback controls
   - Zoom controls
   - Selection tools

**Testable Features:**

- Responsive layout
- Resizable panels
- Full-screen modes
- Theme toggle
- Dark/light theme
- Keyboard shortcuts help
- Settings menu

---

### 7.2 Timeline UI Components

**Description:** Visual timeline elements and interactions

**Components:**

- **TimelinePlayhead:** Current position indicator
- **TimelineRuler:** Time markers and ticks
- **TimelineClipRenderer:** Clip visual representation
- **TimelineTracks:** Track display
- **TimelineMarkers:** Marker display
- **TimelineMinimap:** Timeline overview
- **TimelineTrimOverlay:** Trim drag handles
- **TimelineSelectionRectangle:** Rubber-band selection
- **TimelineSnapGuides:** Snap lines
- **TimelineTextOverlayRenderer:** Text overlay display
- **TimelineGridSettings:** Grid configuration

**Testable Features:**

- Ruler displays correct time
- Clips render at correct positions
- Playhead moves during playback
- Markers display correctly
- Minimap shows overview
- Snap guides appear when dragging
- Selection rectangle works
- Context menus appear on right-click
- Grid snapping works

---

### 7.3 Toolbar & Controls

**Description:** Tool buttons and control options

**Key Files:**

- **Components:**
  - `/components/timeline/TimelineControls.tsx` - Main controls
  - `/components/timeline/TimelineGridSettings.tsx` - Grid controls
  - `/components/preview/PlaybackControls.tsx` - Playback buttons
- **Types:** `/types/editModes.ts` - Edit mode definitions

**Controls:**

1. **File Menu:**
   - New project
   - Open project
   - Save project
   - Import/export

2. **Edit Menu:**
   - Undo/Redo
   - Cut/Copy/Paste
   - Duplicate
   - Delete
   - Select All

3. **View Menu:**
   - Zoom in/out
   - Fit to window
   - Grid toggle
   - Guides toggle
   - Minimap toggle

4. **Effects Menu:**
   - Video effects
   - Audio effects
   - Transitions
   - Text overlays

**Testable Features:**

- All buttons are clickable
- Buttons trigger correct actions
- Keyboard shortcuts work
- Tooltips display
- Buttons disable when unavailable
- Settings persist

---

### 7.4 Context Menus

**Description:** Right-click context menus

**Key Files:**

- **Components:** `/components/timeline/TimelineContextMenu.tsx`

**Context Menus:**

- **Clip Context Menu:**
  - Cut, Copy, Paste
  - Duplicate
  - Delete
  - Properties
  - Lock/Unlock
  - Color labels
  - Add to group
  - Effects menu

- **Track Context Menu:**
  - Mute/Unmute
  - Solo
  - Lock/Unlock
  - Delete track
  - Add track
  - Track settings

- **Timeline Context Menu:**
  - Paste
  - Add marker
  - Add guide
  - Project settings

**Testable Features:**

- Context menu appears on right-click
- All menu items are clickable
- Menu items trigger correct actions
- Menu disappears on click
- Menu disappears on escape key

---

### 7.5 Keyboard Shortcuts

**Description:** Keyboard shortcut support

**Key Files:**

- **Hooks:**
  - `/lib/hooks/useGlobalKeyboardShortcuts.ts` - Global shortcuts
  - `/lib/hooks/useTimelineKeyboardShortcuts.ts` - Timeline shortcuts
  - `/lib/hooks/useKeyboardShortcuts.ts` - Utility
- **Components:**
  - `/components/KeyboardShortcutsHelp.tsx` - Shortcuts help dialog
  - `/components/timeline/KeyboardShortcutsPanel.tsx` - Shortcuts panel

**Common Shortcuts:**

- **Ctrl+Z / Cmd+Z:** Undo
- **Ctrl+Shift+Z / Cmd+Shift+Z:** Redo
- **Ctrl+C / Cmd+C:** Copy
- **Ctrl+X / Cmd+X:** Cut
- **Ctrl+V / Cmd+V:** Paste
- **Ctrl+D / Cmd+D:** Duplicate
- **Delete / Backspace:** Delete
- **Ctrl+A / Cmd+A:** Select all
- **Space:** Play/Pause
- **Ctrl+? / Cmd+?:** Show shortcuts help

**Testable Features:**

- Shortcuts work correctly
- Help dialog shows all shortcuts
- Keyboard shortcuts help appears
- Custom shortcuts can be defined
- Shortcuts work in all contexts

---

### 7.6 Responsive Design

**Description:** Responsive UI for different screen sizes

**Key Files:**

- **CSS:** Tailwind configuration
- **Components:** All components use responsive classes

**Breakpoints:**

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Testable Features:**

- Layout adapts to screen size
- Touch-friendly on mobile
- Panels collapse/expand
- Text is readable
- Buttons are clickable on touch
- Performance on small devices

---

## 8. COLLABORATION

### 8.1 Real-time Chat

**Description:** Chat with AI assistant about project

**Key Files:**

- **API Routes:**
  - `/app/api/projects/[projectId]/chat/route.ts` - Get/delete messages
  - `/app/api/projects/[projectId]/chat/messages/route.ts` - Add message
- **Component:** `/components/editor/ChatBox.tsx`
- **Database:** chat_messages table

**Testable Features:**

- Send message to AI
- Receive AI response
- View message history
- Clear chat history
- Export chat
- AI suggests edits based on messages
- Markdown formatting in responses

---

### 8.2 AI Chat Assistant

**Description:** AI assistant helps with editing decisions

**Key Files:**

- **API Route:** `/app/api/ai/chat/route.ts`
- **Model:** Google Gemini or OpenAI GPT

**Testable Features:**

- Ask editing questions
- Get suggestions
- Get help with effects
- Ask about best practices
- Get timeline suggestions
- AI analyzes current project state

---

## 9. SETTINGS & PREFERENCES

### 9.1 User Preferences

**Description:** User settings and preferences

**Key Files:**

- **Page:** `/app/settings/page.tsx`
- **Component:** `/components/SubscriptionManager.tsx`
- **Service:** `/lib/services/userPreferencesService.ts`
- **Types:** `/types/userPreferences.ts`
- **Database:** user_preferences table

**Settings:**

- **Theme:** Dark/Light mode
- **Auto-save Interval:** Frequency
- **Zoom Defaults:** Default zoom level
- **Playback Speed:** Default playback speed
- **Volume:** Default volume
- **Timeline Grid:** Grid visibility and size
- **Snap Options:** Snapping behavior

**Testable Features:**

- Change theme
- Set auto-save interval
- Set default zoom
- Change grid settings
- Save preferences
- Preferences persist
- Reset to defaults

---

### 9.2 Project Settings

**Description:** Project-specific settings

**Settings:**

- **Output Resolution:** 1280-4096px width/height
- **Frame Rate:** 24, 25, 30, 60 fps
- **Video Codec:** H.264, H.265, VP8, VP9
- **Audio Codec:** AAC, MP3, Opus, Vorbis

**Testable Features:**

- Change output settings
- Update frame rate
- Change codecs
- Save settings
- Apply to all exports

---

### 9.3 Account Settings

**Description:** User account management

**Key Files:**

- **Page:** `/app/settings/page.tsx`
- **Components:**
  - `/components/SubscriptionManager.tsx` - Subscription management
  - `/components/DeleteAccountModal.tsx` - Account deletion
- **API Routes:**
  - `/app/api/user/delete-account/route.ts` - Delete account
  - `/app/api/stripe/portal/route.ts` - Billing portal
  - `/app/api/stripe/checkout/route.ts` - Subscription checkout

**Testable Features:**

- View account info
- Change password
- View subscription status
- Manage billing
- View usage statistics
- Delete account
- Export user data

---

## 10. AUTHENTICATION & AUTHORIZATION

### 10.1 User Authentication

**Key Files:**

- **Supabase Auth:** `/lib/supabase.ts`
- **Pages:**
  - `/app/signin/page.tsx` - Sign in
  - `/app/signup/page.tsx` - Sign up
  - `/app/forgot-password/page.tsx` - Password reset
  - `/app/reset-password/page.tsx` - Reset password
- **Service:** `/lib/services/authService.ts`

**Testable Features:**

- Sign up with email
- Sign in with email
- Sign in with OAuth
- Reset password
- Logout
- Session persistence
- Auth redirect

---

### 10.2 Authorization

**Key Files:**

- **Middleware:** `/lib/api/withAuth.ts`
- **Verification:** `/lib/api/project-verification.ts`

**Authorization Rules:**

- Only project owner can edit
- RLS enforces database access
- API routes check ownership

**Testable Features:**

- User can only access own projects
- User can only access own assets
- Unauthorized requests are rejected
- Sharing allows others to access

---

## 11. ANALYTICS & TRACKING

### 11.1 User Analytics

**Description:** Track user behavior and feature usage

**Key Files:**

- **Service:** `/lib/services/analyticsService.ts`
- **Providers:** PostHog, Sentry
- **API Route:** `/app/api/analytics/web-vitals/route.ts`
- **Web Vitals:** `/lib/webVitals.ts`

**Tracked Events:**

- Project creation
- Asset upload
- Editing actions
- Export completion
- Feature usage
- Performance metrics

**Testable Features:**

- Events are tracked
- Analytics data is sent
- User privacy is respected
- Analytics can be disabled

---

### 11.2 Error Tracking

**Description:** Track and report errors

**Key Files:**

- **Error Tracking:** `/lib/errorTracking.ts`
- **Sentry Service:** `/lib/services/sentryService.ts`
- **Logger:** `/lib/serverLogger.ts`, `/lib/browserLogger.ts`

**Testable Features:**

- Errors are logged
- Stack traces are captured
- User context is included
- Errors are reported to Sentry

---

### 11.3 Audit Logging

**Description:** Log user actions for compliance

**Key Files:**

- **Audit Log:** `/lib/auditLog.ts`

**Testable Features:**

- Actions are logged
- Logs include timestamp
- Logs include user ID
- Logs include action type
- Logs can be exported

---

## 12. PERFORMANCE & OPTIMIZATION

### 12.1 Caching

**Description:** Cache frequently accessed data

**Key Files:**

- **Cache Layer:** `/lib/cache.ts`
- **Cache Invalidation:** `/lib/cacheInvalidation.ts`
- **Cached Data:** `/lib/cachedData.ts`
- **Signed URL Cache:** `/lib/signedUrlCache.ts`

**Cache Strategy:**

- Project metadata: 2 minutes TTL
- Asset list: 5 minutes TTL
- Timeline data: 1 minute TTL
- Signed URLs: 1 hour TTL

**Testable Features:**

- Data is cached
- Cache is invalidated on changes
- Cache TTL is respected
- Cache fallback works

---

### 12.2 Request Deduplication

**Description:** Deduplicate identical requests

**Key Files:**

- **Deduplication:** `/lib/requestDeduplication.ts`

**Testable Features:**

- Duplicate requests are merged
- Single network request for multiple callers
- Reduces server load

---

### 12.3 Rate Limiting

**Description:** Rate limit API requests

**Key Files:**

- **Rate Limit Config:** `/lib/config/rateLimit.ts`
- **Rate Limit Logic:** `/lib/rateLimit.ts`

**Rate Tiers:**

- **TIER 1:** 100 req/min (expensive operations)
- **TIER 2:** 300 req/min (moderate operations)
- **TIER 3:** 600 req/min (read operations)
- **TIER 4:** 1000 req/min (light operations)

**Testable Features:**

- Requests are rate limited
- Limits are enforced per user
- Rate limit headers are returned
- Requests above limit are rejected

---

### 12.4 Bundle Analysis

**Description:** Analyze bundle size

**Scripts:**

- `npm run build:analyze` - Analyze webpack bundle
- `npm run analyze:bundle` - Check bundle size

**Testable Features:**

- Bundle size is analyzed
- Large chunks are identified
- Code splitting works
- Dead code is eliminated

---

## 13. ACCESSIBILITY

### 13.1 Screen Reader Support

**Description:** Screen reader compatibility

**Key Files:**

- **Screen Reader Announcer:** `/lib/utils/screenReaderAnnouncer.ts`
- **ARIA Labels:** Throughout components

**Testable Features:**

- ARIA labels are present
- Screen reader announces actions
- Focus indicators are visible
- Semantic HTML is used

---

### 13.2 Keyboard Navigation

**Description:** Full keyboard control

**Testable Features:**

- Tab navigation works
- Enter activates buttons
- Escape closes modals
- Arrow keys control sliders
- All features accessible via keyboard

---

### 13.3 Color Contrast

**Description:** WCAG color contrast compliance

**Testable Features:**

- Text contrast is adequate
- Colors are distinguishable
- Colorblind-friendly palette
- Dark/light mode both compliant

---

### 13.4 Accessibility Testing

**Key Files:**

- **E2E Tests:** `/e2e/accessibility.spec.ts`
- **Scripts:** `npm run a11y:test`

**Tools:**

- axe-core for accessibility scanning
- Lighthouse for audits
- Playwright for automated testing

---

## 14. API ENDPOINTS SUMMARY

### Project APIs

- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[projectId]` - Get project
- `PUT /api/projects/[projectId]` - Update project
- `DELETE /api/projects/[projectId]` - Delete project

### Asset APIs

- `GET /api/assets` - List assets
- `POST /api/assets` - Create asset record
- `POST /api/assets/upload` - Upload file
- `POST /api/assets/sign` - Get signed URL
- `GET /api/assets/[assetId]/thumbnail` - Get thumbnail
- `PUT /api/assets/[assetId]/update` - Update asset
- `PUT /api/assets/[assetId]/tags` - Update tags

### Export APIs

- `POST /api/export` - Start export job
- `GET /api/export/queue` - List export queue
- `GET /api/export/queue/[jobId]` - Get job status
- `POST /api/export-presets` - Create preset
- `GET /api/export-presets` - List presets

### Generation APIs

- `POST /api/video/generate` - Generate video
- `GET /api/video/status` - Check video status
- `POST /api/image/generate` - Generate image
- `POST /api/audio/suno/generate` - Generate music
- `POST /api/audio/elevenlabs/generate` - Generate voice

### Collaboration APIs

- `POST /api/projects/[projectId]/invites` - Send invite
- `GET /api/projects/[projectId]/collaborators` - List collaborators
- `POST /api/projects/[projectId]/share-links` - Create share link

### Chat APIs

- `GET /api/projects/[projectId]/chat` - Get messages
- `POST /api/projects/[projectId]/chat/messages` - Send message
- `DELETE /api/projects/[projectId]/chat` - Clear messages

### Backup APIs

- `GET /api/projects/[projectId]/backups` - List backups
- `POST /api/projects/[projectId]/backups` - Create backup
- `POST /api/projects/[projectId]/backups/[backupId]/restore` - Restore

---

## 15. DATABASE SCHEMA OVERVIEW

**Core Tables:**

- **projects** - User projects
- **assets** - Media files
- **timelines** - Timeline state per project
- **scenes** - Detected video scenes
- **scene_frames** - Extracted keyframes
- **frame_edits** - AI-edited frames
- **chat_messages** - AI chat history

**Storage Buckets:**

- **assets** - 500 MB max, all media types
- **frames** - 50 MB max, keyframe images
- **frame-edits** - 100 MB max, edited frames

---

## 16. STATE MANAGEMENT

**Zustand Stores:**

- `/state/useTimelineStore.ts` - Timeline state
- `/state/usePlaybackStore.ts` - Playback state
- `/state/useEditorStore.ts` - Main editor state (composition of slices)
- `/state/useSelectionStore.ts` - Selection state
- `/state/useHistoryStore.ts` - Undo/redo history
- `/state/useClipboardStore.ts` - Clipboard operations

---

## Testing Checklist Categories

### Core Editing (Priority: Critical)

- [ ] Timeline management
- [ ] Clip operations (add, remove, reorder)
- [ ] Clip properties (effects, transforms)
- [ ] Transitions between clips
- [ ] Text overlays with animations
- [ ] Playback controls
- [ ] Selection and multi-selection

### Project Management (Priority: Critical)

- [ ] Create/open/save/delete projects
- [ ] Undo/redo functionality
- [ ] Import/export projects
- [ ] Project backups

### Asset Pipeline (Priority: High)

- [ ] Upload assets
- [ ] Asset library browsing
- [ ] Asset search/filter/sort
- [ ] Thumbnail generation
- [ ] Asset versioning

### Generation (Priority: High)

- [ ] Video generation
- [ ] Image generation
- [ ] Audio generation
- [ ] Video upscaling

### Export & Rendering (Priority: High)

- [ ] Export to video file
- [ ] Export presets
- [ ] Queue management

### UI & UX (Priority: Medium)

- [ ] Editor layout
- [ ] Toolbar and controls
- [ ] Context menus
- [ ] Keyboard shortcuts
- [ ] Responsive design

### Collaboration (Priority: Medium)

- [ ] AI chat assistant
- [ ] Project sharing
- [ ] Collaborator management

### Settings (Priority: Low)

- [ ] User preferences
- [ ] Project settings
- [ ] Account settings

### Accessibility (Priority: Medium)

- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast
- [ ] Focus indicators
