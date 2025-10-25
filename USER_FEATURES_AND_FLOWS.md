# Non-Linear Video Editor - Comprehensive User-Facing Features Analysis

## Executive Summary

This is a modern, browser-based non-linear video editor built with Next.js 16, React 19, and Supabase. The application provides a complete video editing solution with timeline management, AI-powered asset generation, collaboration features, and multiple export options.

---

## TABLE OF CONTENTS

1. [Core User-Facing Pages](#core-user-facing-pages)
2. [Feature Domains](#feature-domains)
3. [Critical User Flows](#critical-user-flows)
4. [API Endpoints Grouped by Feature](#api-endpoints-grouped-by-feature)
5. [Authentication & Authorization](#authentication--authorization)
6. [State Management Architecture](#state-management-architecture)
7. [Advanced Features](#advanced-features)

---

## CORE USER-FACING PAGES

### 1. Authentication Pages

- **`/signin`** - Email/password login with guest access option
- **`/signup`** - User registration with email/password
- **`/forgot-password`** - Password reset request
- **`/reset-password`** - Password reset confirmation
- **`/logout`** - User logout page

### 2. Main Application Pages

- **`/`** (Home) - Redirects authenticated users to most recent project or creates default project
- **`/settings`** - User account settings (password change, subscription, activity history, keyboard shortcuts)
- **`/admin`** - Admin dashboard (requires admin tier) for user management and tier modifications
- **`/docs`** - Documentation pages
- **`/api-docs`** - API documentation

### 3. Editor Pages (Dynamic Project Routes)

All editor routes require authentication and project ownership verification.

#### Timeline Editor

- **`/editor/[projectId]/timeline`** - Main timeline-based video editor
  - Multi-track timeline with clips, transitions, text overlays
  - Playback controls and scrubbing
  - Zoom, snap-to-grid, guides
  - Keyboard shortcuts and undo/redo

#### Video Generation

- **`/editor/[projectId]/generate-video`** - AI video generation from text prompts
  - Support for Google Veo, FAL.ai Seedance, MiniMax models
  - Aspect ratio and duration controls
  - Seed-based reproducibility
  - Multiple sample generation

#### Audio Generation

- **`/editor/[projectId]/generate-audio`** - AI audio generation
  - Text-to-speech (ElevenLabs)
  - Music generation (Suno via Comet API)
  - Sound effects generation
  - Voice selection and customization

#### Keyframe Animation

- **`/editor/[projectId]/keyframe`** - Advanced keyframe editor
  - Frame-by-frame animation controls
  - Keyframe curves and easing
  - Version history and gallery preview
  - Image upload and editing

#### Default Editor Route

- **`/editor/[projectId]`** - Redirects to appropriate sub-editor

### 4. Standalone Generation Pages

- **`/video-gen`** - Standalone video generation (no project context)
- **`/audio-gen`** - Standalone audio generation
- **`/image-gen`** - Standalone image generation

---

## FEATURE DOMAINS

### 1. PROJECT MANAGEMENT

**Core Capabilities:**

- Create new video projects
- List user's projects
- Open/edit existing projects
- Delete projects
- Export/import entire projects
- Project metadata and configuration
- Activity history tracking

**Related Components:**

- `ProjectList.tsx` - Display user projects
- `CreateProjectButton.tsx` - Create new project
- `ProjectExportImport.tsx` - Export/import functionality

**State Management:**

- Editor Store (Zustand) for timeline state per project

---

### 2. TIMELINE EDITING

**Core Capabilities:**

- **Multi-Track System:**
  - Unlimited video, audio, and image tracks
  - Per-track visibility, muting, solo controls
  - Per-track height customization
  - Track locking

- **Clip Management:**
  - Add/remove clips to timeline
  - Drag-and-drop positioning
  - Trimming (clip start/end time adjustment)
  - Splitting clips at playhead position
  - Duplicating clips
  - Copy/paste between projects
  - Clip grouping and locking
  - Clip color tagging for organization
  - Clip speed adjustment (0.25x - 4x)

- **Visual Timeline:**
  - Zoomable timeline (multiple zoom levels)
  - Snap-to-grid functionality
  - Vertical guides and snap guides
  - Visual timeline markers
  - Playhead scrubbing
  - Timeline minimap
  - Clip virtualization for performance

- **Rendering & Playback:**
  - Multi-track video synchronization
  - RAF-based smooth playback at 60fps
  - Real-time audio mixing
  - Timecode display
  - Buffering management

**Components:**

- `BrowserEditorClient.tsx` - Main editor client
- `TimelineClipRenderer.tsx` - Clip rendering
- `TimelineRuler.tsx` - Timeline ruler
- `TimelinePlayhead.tsx` - Playhead control
- `TimelineSelectionRectangle.tsx` - Multi-select
- `TimelineMinimap.tsx` - Timeline overview
- `TimelineSnapGuides.tsx` - Snap guides
- `TimelineContextMenu.tsx` - Right-click menu
- `TimelineGridSettings.tsx` - Grid configuration

**State Slices:**

- `clips.ts` - Clip operations
- `tracks.ts` - Track management
- `playback.ts` - Playback state
- `zoom.ts` - Zoom level
- `markers.ts` - Timeline markers
- `guides.ts` - Guides system

---

### 3. CLIP EFFECTS & CORRECTIONS

**Video Effects:**

- Brightness, contrast, saturation adjustment
- Hue rotation
- Blur effect
- Crop rectangles (frame composition)

**Audio Effects:**

- Volume control (-60 to +12 dB)
- Fade in/fade out durations
- 3-band EQ (Bass, Mid, Treble)
- Compression
- Auto-normalization to -3dB peak

**Transformations:**

- Rotation (0-360 degrees)
- Horizontal/vertical flipping
- Scale/zoom (0.1x - 3x)

**Per-Clip Properties:**

- Opacity (0-1)
- Volume (0-2)
- Playback speed (0.25x - 4x)
- Muting

**Components:**

- `ColorCorrectionSection.tsx` - Video effects
- `TransformSection.tsx` - Transform controls
- `AudioEffectsSection.tsx` - Audio effects
- `VideoEffectsSection.tsx` - Video effects
- `ClipPropertiesPanel.tsx` - Clip property editor
- `TimelineCorrectionsMenu.tsx` - Effects menu

---

### 4. TRANSITIONS

**Supported Transitions:**

- None (cut)
- Crossfade
- Fade-in / Fade-out
- Slide (left, right, up, down)
- Wipe (left, right)
- Zoom in / Zoom out

**Capabilities:**

- Per-clip transition to next clip
- Configurable transition duration
- Visual preview in timeline

**State Management:**

- `transitions.ts` - Transition state

---

### 5. TEXT OVERLAYS

**Capabilities:**

- Add/edit text on timeline
- Per-text opacity and timing
- Text positioning on canvas
- Font family, size, color selection
- Text effects (shadow, outline)
- Rich text formatting

**Components:**

- `TextOverlayEditor.tsx` - Text editor UI
- `TextOverlayRenderer.tsx` - Render text on canvas
- `TimelineTextOverlayRenderer.tsx` - Timeline text rendering
- `TimelineTextOverlayTrack.tsx` - Text overlay track

**State Management:**

- `textOverlays.ts` - Text overlay state

---

### 6. ASSET MANAGEMENT

**Asset Types:**

- Video files (MP4, WebM, etc.)
- Audio files (MP3, WAV, etc.)
- Image files (PNG, JPG, etc.)

**Core Capabilities:**

- Upload assets from device
- Drag-and-drop upload
- Automatic thumbnail generation
- Signed secure URLs for playback
- Asset versioning and history
- Asset tagging for organization
- Delete assets
- Audio waveform visualization
- Scene detection (automatic clip breaks)
- Audio splitting/isolation

**Advanced Processing:**

- Video upscaling (using FAL.ai)
- Scene detection and auto-split
- Audio extraction from video
- Audio format conversion

**Components:**

- `AssetPanel.tsx` - Asset browser
- `ResizableAssetPanel.tsx` - Resizable panel
- `AssetVersionHistory.tsx` - Version management
- `DragDropZone.tsx` - Drag-drop upload
- `AudioWaveform.tsx` - Waveform display
- `PreviewPlayer.tsx` - Asset preview

---

### 7. VIDEO GENERATION (AI-Powered)

**Models Supported:**

- **Google Veo:**
  - `veo-3.1-generate-preview` (latest, audio-capable)
  - `veo-3.1-fast-generate-preview` (faster, audio-capable)
  - `veo-2.0-generate-001` (standard)

- **FAL.ai:**
  - `seedance-1.0-pro` (text-to-video)
  - `minimax-hailuo-02-pro` (text-to-video)

**Generation Parameters:**

- Text-to-video prompt (3-1000 chars)
- Image-to-video (using uploaded image as first frame)
- Aspect ratio (16:9, 9:16, 1:1, 4:3, 3:4)
- Duration (model-dependent)
- Resolution (480p, 720p, 1080p)
- Negative prompt (things to avoid)
- Person generation controls
- Seed for reproducible generation
- Sample count (1-4 variations)
- Optional prompt enhancement
- Optional audio generation (Veo only)

**Workflow:**

1. Select model and parameters
2. Enter prompt
3. Submit generation request
4. Poll status API for progress
5. Download generated video to assets
6. Add to timeline

**Components:**

- `GenerateVideoTab.tsx` - Video generation UI
- `VideoGenerationForm.tsx` - Form controls
- `VideoGenerationSettings.tsx` - Advanced settings
- `VideoGenerationQueue.tsx` - Queue management
- `VideoQueueItem.tsx` - Individual item display
- `GenerationProgress.tsx` - Progress indicator

**API Endpoints:**

- `POST /api/video/generate` - Submit generation
- `GET /api/video/status` - Poll generation status
- `GET /api/video/generate-audio-status` - Audio generation status

---

### 8. IMAGE GENERATION

**Model:**

- Google Imagen 3
  - `imagen-3.0-generate-001` (standard)
  - `imagen-3.0-fast` (faster)

**Parameters:**

- Text prompt (1-1000 chars)
- Image count (1-4)
- Safety filter level (block_most, block_some, block_few)
- Output format (PNG or JPEG)
- Seed for reproducibility

**Components:**

- Standalone page: `/image-gen`
- Editor integration: `/editor/[projectId]/generate-video` tab

---

### 9. AUDIO GENERATION

**Text-to-Speech (ElevenLabs):**

- 30+ voice options
- Multiple languages
- Stability and clarity controls
- Voice preview

**Music Generation (Suno via Comet API):**

- Generative music from text description
- Style/genre specification
- Duration control
- Musical key and tempo options

**Sound Effects (ElevenLabs SFX):**

- Text-to-SFX generation
- Duration control
- Multiple variations

**Components:**

- `GenerateAudioTab.tsx` - Audio generation UI
- `VoiceGenerationForm.tsx` - Voice generation form
- `MusicGenerationForm.tsx` - Music generation form
- `SFXGenerationForm.tsx` - SFX generation form
- `AudioTypeSelector.tsx` - Generation type selection
- `VoiceSelector.tsx` - Voice selection

**API Endpoints:**

- `POST /api/audio/elevenlabs/generate` - TTS generation
- `GET /api/audio/elevenlabs/voices` - List voices
- `POST /api/audio/elevenlabs/sfx` - SFX generation
- `POST /api/audio/suno/generate` - Music generation
- `GET /api/audio/suno/status` - Music generation status

---

### 10. KEYFRAME ANIMATION

**Capabilities:**

- Frame-by-frame animation controls
- Keyframe curve editor with easing
- Position, scale, rotation keyframes
- Opacity keyframes
- Version history (multiple animation versions)
- Gallery preview of versions
- Image frame upload and replacement

**Components:**

- `KeyframeEditorShell.tsx` - Main editor
- `KeyframePageClient.tsx` - Client component
- `KeyframeSidebar.tsx` - Keyframe list
- `KeyframePreview.tsx` - Preview panel
- `EditControls.tsx` - Edit controls
- `VersionsGallery.tsx` - Version gallery

**Hooks:**

- `useKeyframeData.ts` - Data management
- `useKeyframeEditing.ts` - Editing operations
- `useKeyframeSelection.ts` - Selection state
- `useFramesData.ts` - Frame data
- `useImageUpload.ts` - Image upload

---

### 11. EXPORT & RENDERING

**Current Status:**

- Export API framework ready for video rendering
- Job-based queuing system with status tracking
- Priority management (pause, resume, adjust priority)

**Supported Formats:**

- MP4 (H.264 video codec)
- WebM (VP8/VP9 video codec)

**Export Parameters:**

- Resolution (width/height)
- Frame rate (fps)
- Video bitrate (Kbps)
- Audio bitrate (Kbps)
- Format selection

**Features:**

- Export presets for common platforms
- Custom preset creation
- Export queue management
- Job prioritization
- Real-time job monitoring

**Export Presets for Platforms:**

- YouTube (1080p, 4K)
- YouTube Shorts
- Instagram (Feed, Story, Reel)
- TikTok
- Twitter/X
- Facebook
- LinkedIn

**Components:**

- `ExportModal.tsx` - Export dialog
- `ProjectExportImport.tsx` - Project export/import

**API Endpoints:**

- `POST /api/export` - Create export job
- `GET /api/export/queue` - List jobs
- `GET /api/export/queue/[jobId]` - Get job status
- `PATCH /api/export/queue/[jobId]/pause` - Pause job
- `PATCH /api/export/queue/[jobId]/resume` - Resume job
- `PATCH /api/export/queue/[jobId]/priority` - Adjust priority
- `GET /api/export-presets` - List presets
- `POST /api/export-presets` - Create custom preset
- `GET /api/export-presets/[presetId]` - Get preset
- `PUT /api/export-presets/[presetId]` - Update preset
- `DELETE /api/export-presets/[presetId]` - Delete preset

---

### 12. UNDO/REDO & HISTORY

**Capabilities:**

- 50-action history (configurable)
- Per-clip operation debouncing
- Full timeline snapshots for history entries
- Undo/redo keyboard shortcuts (Cmd/Ctrl+Z/Y)

**Operations Tracked:**

- Clip additions/removals
- Clip modifications (trim, move, effects)
- Transition changes
- Text overlay changes
- Track modifications
- Clip grouping
- Clip locking

**State Management:**

- `useHistoryStore.ts` - History state and operations

---

### 13. CLIPBOARD & MULTI-SELECT

**Capabilities:**

- Copy/paste clips
- Multi-select clips (Shift-click, Cmd/Ctrl-A)
- Copy between projects
- Paste with automatic timeline position adjustment
- Copy/paste keyboard shortcuts

**State Management:**

- `useClipboardStore.ts` - Clipboard state

---

### 14. COLLABORATION & SHARING

**Roles:**

- Owner (full control)
- Editor (can edit project)
- Viewer (read-only access)

**Sharing Methods:**

1. **Direct Invites:**
   - Invite by email
   - Send invitation link
   - Expiration dates
   - Role-based permissions

2. **Share Links:**
   - Generate shareable links
   - Token-based authentication
   - Role-based access
   - Max use limits
   - Expiration dates
   - Active/inactive toggle

3. **Direct Collaborator Addition:**
   - Add existing platform users
   - Remove collaborators
   - Change collaborator roles

**Tracking:**

- Collaborator last seen timestamp
- Online status tracking
- Invitation status (pending/accepted/expired)

**Components:**

- `ProjectBackupManager.tsx` - Backup management

**API Endpoints:**

- `GET /api/projects/[projectId]/collaborators` - List collaborators
- `POST /api/projects/[projectId]/collaborators` - Add collaborator
- `DELETE /api/projects/[projectId]/collaborators/[collaboratorId]` - Remove collaborator
- `PUT /api/projects/[projectId]/collaborators/[collaboratorId]` - Update role
- `GET /api/projects/[projectId]/invites` - List invites
- `POST /api/projects/[projectId]/invites` - Send invite
- `DELETE /api/projects/[projectId]/invites/[inviteId]` - Revoke invite
- `POST /api/projects/[projectId]/invites/[inviteId]` - Accept invite
- `GET /api/projects/[projectId]/share-links` - List share links
- `POST /api/projects/[projectId]/share-links` - Create share link
- `DELETE /api/projects/[projectId]/share-links/[linkId]` - Delete share link
- `PUT /api/projects/[projectId]/share-links/[linkId]` - Update share link
- `POST /api/join/[token]` - Accept share link

---

### 15. PROJECT TEMPLATES

**Capabilities:**

- Save projects as templates
- Filter templates by category, tags
- Public/private templates
- Featured templates
- Use template to create new project
- Template search
- Platform-specific templates

**Components:**

- `AssetLibraryModal.tsx` - Asset library selection

**API Endpoints:**

- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/[templateId]` - Get template
- `PUT /api/templates/[templateId]` - Update template
- `DELETE /api/templates/[templateId]` - Delete template
- `POST /api/templates/[templateId]/use` - Create project from template

---

### 16. PROJECT BACKUPS & RESTORATION

**Capabilities:**

- Automatic backups (configurable intervals)
- Manual backup creation
- Backup history with timestamps
- Restore to any backup point
- Backup listing with metadata

**Backup Types:**

- Auto (system-generated)
- Manual (user-created)

**Components:**

- `ProjectBackupManager.tsx` - Backup UI

**API Endpoints:**

- `GET /api/projects/[projectId]/backups` - List backups
- `POST /api/projects/[projectId]/backups` - Create backup
- `GET /api/projects/[projectId]/backups/[backupId]` - Get backup details
- `DELETE /api/projects/[projectId]/backups/[backupId]` - Delete backup
- `POST /api/projects/[projectId]/backups/[backupId]/restore` - Restore backup

---

### 17. ACTIVITY HISTORY

**Tracking:**

- User actions within projects
- Collaborator activity
- Asset modifications
- Project updates
- Export jobs

**Components:**

- `ActivityHistory.tsx` - Activity display

**API Endpoints:**

- `GET /api/projects/[projectId]/activity` - Get activity log

---

### 18. AI ASSISTANT CHAT

**Features:**

- Context-aware help
- Project-specific chat history
- Google Gemini-powered responses
- Per-project chat thread
- Message persistence

**Components:**

- `ChatBox.tsx` - Chat UI
- Responsive sidebar (desktop/mobile)
- Collapsible assistant panel

**API Endpoints:**

- `POST /api/projects/[projectId]/chat` - Send message
- `GET /api/projects/[projectId]/chat` - Get history
- `DELETE /api/projects/[projectId]/chat` - Clear history
- `POST /api/projects/[projectId]/chat/messages` - Send message (direct)

---

### 19. SUBSCRIPTIONS & BILLING

**Tier System:**

- Free (limited features)
- Premium (full features)
- Admin (platform administration)

**Subscription Management:**

- Stripe integration
- Checkout session creation
- Billing portal access
- Subscription status tracking

**API Endpoints:**

- `POST /api/stripe/checkout` - Create checkout session
- `GET /api/stripe/portal` - Access billing portal
- `POST /api/stripe/webhook` - Stripe webhook handler

---

### 20. USER ACCOUNT MANAGEMENT

**Features:**

- Password change
- Account deletion
- Email address management
- Subscription status viewing
- Activity history
- Keyboard shortcuts reference
- Theme toggle (light/dark mode)

**Components:**

- `SubscriptionManager.tsx` - Subscription display
- `UserMenu.tsx` - User dropdown menu
- `DeleteAccountModal.tsx` - Account deletion
- `ThemeToggle.tsx` - Theme switching
- `KeyboardShortcutsPanel.tsx` - Shortcuts reference

**API Endpoints:**

- `DELETE /api/user/delete-account` - Delete user account
- `POST /api/auth/signout` - Sign out

---

### 21. ADMIN FEATURES

**Capabilities:**

- View all users
- Modify user subscription tiers
- Delete users (with confirmation)
- Cache management
- System health monitoring

**Components:**

- Admin dashboard at `/admin`

**API Endpoints:**

- `POST /api/admin/change-tier` - Change user tier
- `DELETE /api/admin/delete-user` - Delete user
- `POST /api/admin/cache` - Cache management

---

### 22. SYSTEM HEALTH & MONITORING

**Endpoints:**

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

**Logging & Analytics:**

- Browser error tracking
- API request/response logging
- Performance metrics via web vitals
- Axiom integration for structured logging

**API Endpoints:**

- `POST /api/logs` - Submit logs
- `POST /api/analytics/web-vitals` - Submit web vitals
- `POST /api/feedback` - Submit user feedback

---

## CRITICAL USER FLOWS

### 1. Create Project & Start Editing

```
Sign Up/Sign In
    ↓
Redirect to Home (/)
    ↓
Create New Project (optional)
    ↓
Navigate to /editor/[projectId]/timeline
    ↓
Upload Assets or Generate with AI
    ↓
Drag Assets to Timeline
    ↓
Edit Clips (trim, effects, transitions)
    ↓
Add Text Overlays
    ↓
Preview and Iterate
    ↓
Export Video
```

### 2. Generate Video with AI

```
Open /editor/[projectId]/generate-video
    ↓
Select AI Model (Veo, FAL.ai)
    ↓
Enter Text Prompt
    ↓
Configure Parameters (aspect ratio, duration, seed)
    ↓
Submit Generation
    ↓
Poll Status API
    ↓
Download Generated Video to Assets
    ↓
Add to Timeline
```

### 3. Generate Audio with AI

```
Open /editor/[projectId]/generate-audio
    ↓
Select Audio Type (TTS, Music, SFX)
    ↓
Configure Type-Specific Options
    ↓
Submit Generation
    ↓
Poll Status API
    ↓
Download to Assets
    ↓
Add to Audio Track
```

### 4. Share Project with Collaborators

```
Open Project
    ↓
Access Sharing Options
    ↓
Option A: Send Email Invite
    ├─ Select Role (Editor/Viewer)
    ├─ Send Invitation Link
    └─ Collaborator Accepts

Option B: Generate Share Link
    ├─ Create Token-Based Link
    ├─ Set Expiration/Max Uses
    └─ Share Link Publicly

Option C: Add Direct Collaborator
    ├─ Search Existing User
    ├─ Select Role
    └─ Grant Access
```

### 5. Apply Effects & Corrections to Clip

```
Select Clip on Timeline
    ↓
Open Clip Properties Panel
    ↓
Choose Effect Type:
    ├─ Video Effects (brightness, contrast, etc.)
    ├─ Audio Effects (EQ, compression, etc.)
    ├─ Transform (rotation, flip, scale)
    └─ Transitions (to next clip)

Adjust Parameters
    ↓
Preview Changes in Real-Time
    ↓
Save to Clip
```

### 6. Create & Apply Transition

```
Select Clip on Timeline
    ↓
Open Transitions Menu
    ↓
Select Transition Type (crossfade, fade, slide, etc.)
    ↓
Set Transition Duration
    ↓
Preview Transition
    ↓
Apply to Clip
```

### 7. Export Video

```
Open Project
    ↓
Select Export Option
    ↓
Choose Export Preset or Create Custom
    ↓
Select Platform or Custom Specs
    ↓
Configure Output:
    ├─ Resolution
    ├─ Frame Rate
    ├─ Video Bitrate
    ├─ Audio Bitrate
    └─ Format (MP4/WebM)

Submit Export Job
    ↓
Monitor Export Queue
    ↓
Download When Complete
```

### 8. Keyframe Animation

```
Open /editor/[projectId]/keyframe
    ↓
Upload/Select Base Image
    ↓
Create Animation:
    ├─ Set Keyframes (position, scale, rotation, opacity)
    ├─ Adjust Timing
    ├─ Configure Easing Curves
    └─ Preview

Generate Variations (multiple versions)
    ↓
Select Best Version
    ↓
Export to Timeline or Assets
```

### 9. Backup & Restore Project

```
Open Project
    ↓
Access Backups
    ↓
Option A: Create Manual Backup
    └─ Save Current State

Option B: View Auto Backups
    └─ List with Timestamps

Restore from Any Backup
    ↓
Confirm Restore
    ↓
Project Reloaded to Backup State
```

### 10. Upgrade to Premium

```
Settings Page (/settings)
    ↓
Subscription Section
    ↓
Click "Upgrade to Premium"
    ↓
Stripe Checkout
    ↓
Complete Payment
    ↓
Redirect Back to Settings
    ↓
Premium Features Unlocked
```

---

## API ENDPOINTS GROUPED BY FEATURE

### PROJECT MANAGEMENT

```
POST   /api/projects                          Create new project
GET    /api/projects                          List user's projects
GET    /api/projects/[projectId]              Get project details
PUT    /api/projects/[projectId]              Update project
DELETE /api/projects/[projectId]              Delete project
```

### ASSET MANAGEMENT

```
GET    /api/assets                            List assets (with pagination)
POST   /api/assets/upload                     Upload asset
GET    /api/assets/sign                       Get signed URL for asset
GET    /api/assets/[assetId]/thumbnail        Get asset thumbnail
PUT    /api/assets/[assetId]/update           Update asset metadata
DELETE /api/assets/[assetId]                  Delete asset
PUT    /api/assets/[assetId]/tags             Update asset tags
GET    /api/assets/[assetId]/versions         List asset versions
POST   /api/assets/[assetId]/versions         Create new asset version
PUT    /api/assets/[assetId]/versions/[versionId]/revert  Revert to version
```

### VIDEO GENERATION

```
POST   /api/video/generate                    Generate video from prompt
GET    /api/video/status                      Poll video generation status
POST   /api/video/upscale                     Upscale video
GET    /api/video/upscale-status              Poll upscale status
POST   /api/video/split-scenes                Auto-detect scenes
POST   /api/video/split-audio                 Extract audio from video
POST   /api/video/generate-audio              Generate audio for video
GET    /api/video/generate-audio-status       Poll audio generation status
```

### AUDIO GENERATION

```
POST   /api/audio/elevenlabs/generate         Text-to-speech
POST   /api/audio/elevenlabs/sfx              Sound effects
GET    /api/audio/elevenlabs/voices           List TTS voices
POST   /api/audio/suno/generate               Generate music
GET    /api/audio/suno/status                 Poll music generation status
```

### IMAGE GENERATION

```
POST   /api/image/generate                    Generate image from prompt
```

### EXPORT & RENDERING

```
POST   /api/export                            Create export job
GET    /api/export/queue                      List export jobs
GET    /api/export/queue/[jobId]              Get job status
PATCH  /api/export/queue/[jobId]/pause        Pause export job
PATCH  /api/export/queue/[jobId]/resume       Resume export job
PATCH  /api/export/queue/[jobId]/priority     Adjust job priority
```

### EXPORT PRESETS

```
GET    /api/export-presets                    List export presets
POST   /api/export-presets                    Create custom preset
GET    /api/export-presets/[presetId]         Get preset details
PUT    /api/export-presets/[presetId]         Update preset
DELETE /api/export-presets/[presetId]         Delete preset
```

### TEMPLATES

```
GET    /api/templates                         List templates (with filters)
POST   /api/templates                         Save project as template
GET    /api/templates/[templateId]            Get template
PUT    /api/templates/[templateId]            Update template
DELETE /api/templates/[templateId]            Delete template
POST   /api/templates/[templateId]/use        Create project from template
```

### BACKUPS & RESTORE

```
GET    /api/projects/[projectId]/backups                    List backups
POST   /api/projects/[projectId]/backups                    Create backup
GET    /api/projects/[projectId]/backups/[backupId]         Get backup
DELETE /api/projects/[projectId]/backups/[backupId]         Delete backup
POST   /api/projects/[projectId]/backups/[backupId]/restore Restore backup
```

### COLLABORATION & SHARING

```
GET    /api/projects/[projectId]/collaborators                  List collaborators
POST   /api/projects/[projectId]/collaborators                  Add collaborator
DELETE /api/projects/[projectId]/collaborators/[collaboratorId] Remove collaborator
PUT    /api/projects/[projectId]/collaborators/[collaboratorId] Update role
GET    /api/projects/[projectId]/invites                        List invites
POST   /api/projects/[projectId]/invites                        Send invite
DELETE /api/projects/[projectId]/invites/[inviteId]             Revoke invite
POST   /api/projects/[projectId]/invites/[inviteId]             Accept invite
GET    /api/projects/[projectId]/share-links                    List share links
POST   /api/projects/[projectId]/share-links                    Create share link
DELETE /api/projects/[projectId]/share-links/[linkId]           Delete share link
PUT    /api/projects/[projectId]/share-links/[linkId]           Update share link
POST   /api/join/[token]                                        Accept share link
```

### CHAT & AI ASSISTANT

```
POST   /api/projects/[projectId]/chat              Send chat message
GET    /api/projects/[projectId]/chat              Get chat history
DELETE /api/projects/[projectId]/chat              Clear chat
POST   /api/projects/[projectId]/chat/messages     Send message (direct)
POST   /api/ai/chat                                AI chat (standalone)
```

### ACTIVITY & HISTORY

```
GET    /api/projects/[projectId]/activity         Get activity log
GET    /api/history                                Get user history
```

### KEYFRAME EDITING

```
PUT    /api/frames/[frameId]/edit                  Edit keyframe
```

### SUBSCRIPTION & BILLING

```
POST   /api/stripe/checkout                       Create checkout session
GET    /api/stripe/portal                         Access billing portal
POST   /api/stripe/webhook                        Stripe webhook
```

### AUTHENTICATION

```
POST   /api/auth/signout                          Sign out user
```

### USER ACCOUNT

```
DELETE /api/user/delete-account                   Delete user account
```

### ADMIN

```
POST   /api/admin/change-tier                     Change user tier
DELETE /api/admin/delete-user                     Delete user
POST   /api/admin/cache                           Manage cache
```

### SYSTEM

```
GET    /api/health                                Health check
GET    /api/health/detailed                       Detailed health
POST   /api/logs                                  Submit logs
POST   /api/analytics/web-vitals                  Submit web vitals
POST   /api/feedback                              Submit feedback
GET    /api/docs                                  API documentation
```

---

## AUTHENTICATION & AUTHORIZATION

### Authentication Methods

1. **Email/Password Authentication**
   - Supabase Auth
   - Strong password requirements (validated client & server)
   - Session management (24-hour web sessions, 8-hour mobile)

2. **Anonymous/Guest Access**
   - Optional guest login without email
   - Limited functionality

3. **Password Reset**
   - Email-based password reset flow
   - Reset token validation

### Authorization

1. **Role-Based Access Control:**
   - **User Tier Levels:**
     - Free: Limited features
     - Premium: Full features
     - Admin: Platform administration

2. **Project-Level Permissions:**
   - Owner: Full control
   - Editor: Can modify project
   - Viewer: Read-only access

3. **Row-Level Security (RLS):**
   - Enforced at database level
   - Users can only access own projects
   - Shared projects validated by collaborators table
   - Invites and share links validated

4. **API Route Protection:**
   - All protected routes use `withAuth` middleware
   - Automatic user extraction from session
   - Rate limiting per endpoint

### Rate Limiting

Different tiers for different operations:

- **Tier 1:** High-rate operations (reads, status checks)
- **Tier 2:** Resource creation (projects, assets)
- **Tier 3:** Moderate operations (asset updates, exports)
- **Tier 4:** Heavy operations (large uploads, batch operations)

---

## STATE MANAGEMENT ARCHITECTURE

### Global Stores (Zustand)

1. **useEditorStore** - Primary timeline state
   - All clip data
   - Track configuration
   - Playback position
   - Selection state
   - Undo/redo history

2. **useSelectionStore** - Multi-clip selection
   - Selected clip IDs
   - Selection mode

3. **useClipboardStore** - Copy/paste state
   - Copied clips
   - Copy source project

4. **usePlaybackStore** - Playback controls
   - Playing state
   - Playback position
   - Playback speed

5. **useTimelineStore** - Timeline UI state
   - Zoom level
   - Scroll position
   - Visible range

6. **useHistoryStore** - Undo/redo management
   - History stack
   - Current position
   - Debounced saves

### Store Slices (Composed)

Within useEditorStore:

- **clipsSlice** - Clip operations (add, update, remove, duplicate, split)
- **tracksSlice** - Track management (mute, solo, lock)
- **playbackSlice** - Playback state
- **textOverlaysSlice** - Text overlay management
- **transitionsSlice** - Transition state
- **markersSlice** - Timeline markers
- **guidesSlice** - Guide lines
- **zoomSlice** - Zoom level
- **lockSlice** - Clip locking
- **groupsSlice** - Clip grouping

### Middleware

- **Immer:** Enables mutation syntax for immutable updates
- **enableMapSet():** Supports Set<string> for selectedClipIds

### Persistence

- Project state saved to server: `/api/projects/[projectId]`
- Auto-save with 2-second debounce
- Manual save via backup creation

---

## ADVANCED FEATURES

### 1. Smart Asset Processing

- Automatic thumbnail generation
- Scene detection (groups consecutive similar frames)
- Audio extraction from video
- Video upscaling (2x, 4x)
- Waveform visualization

### 2. Real-Time Collaboration

- Live collaborator presence
- Shared project state
- Activity tracking
- Real-time notifications (when available)

### 3. Multi-Model AI Support

- Fallback mechanisms between models
- Model-specific feature support (audio generation, aspect ratios)
- Seed-based reproducibility
- Variation generation

### 4. Performance Optimizations

- Clip virtualization (renders only visible clips)
- Lazy component loading
- Server-side caching (2-minute TTL)
- Client-side caching for assets
- Efficient history snapshots

### 5. Keyboard Shortcuts

- Timeline editing (spacebar = play/pause)
- Clip selection (A = select all, D = deselect)
- Editing (X = split, C = copy, V = paste)
- History (Cmd/Ctrl+Z = undo, Cmd/Ctrl+Y = redo)
- Customizable shortcuts in settings

### 6. Accessibility Features

- Screen reader announcements
- Keyboard navigation
- High contrast mode support
- ARIA labels
- Focus management

### 7. Error Handling

- Error boundaries for components
- Graceful fallbacks
- User-friendly error messages
- Automatic retry logic
- Detailed logging

### 8. Data Integrity

- Backup system with restoration
- Version history for assets
- Conflict resolution for collaborative edits
- Data validation (server-side)

---

## TECHNOLOGY STACK SUMMARY

- **Frontend:** React 19, Next.js 16, TypeScript
- **UI:** Tailwind CSS 4.0, Lucide Icons
- **State:** Zustand with Immer
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **AI Services:**
  - Google Veo (video generation)
  - Google Imagen (image generation)
  - Google Gemini (chat)
  - ElevenLabs (TTS, SFX)
  - Suno (music, via Comet API)
  - FAL.ai (video upscaling, alternative video models)
- **Payments:** Stripe
- **Logging:** Axiom
- **Analytics:** PostHog

---

## END OF ANALYSIS

This comprehensive feature list covers all user-facing functionality of the Non-Linear Video Editor application. Each feature includes details about capabilities, components, state management, and relevant API endpoints.

For detailed testing coverage, focus on:

1. Core timeline editing workflows
2. AI generation pipelines
3. Collaboration and sharing
4. Export functionality
5. Account management and subscriptions
6. Error handling and edge cases
