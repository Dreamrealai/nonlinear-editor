# Non-Linear Video Editor - Comprehensive Testing Checklist

This checklist covers ALL user-facing features and functionality for thorough testing.

## Authentication & Account

- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Guest/anonymous sign in
- [ ] Forgot password flow
- [ ] Reset password with email link
- [ ] Change password in settings
- [ ] Logout
- [ ] Session timeout behavior
- [ ] Strong password validation
- [ ] Delete account with confirmation

## Project Management

- [ ] Create new project (auto-generate default)
- [ ] Create multiple projects
- [ ] List all user projects
- [ ] Open/edit existing project
- [ ] Delete project with confirmation
- [ ] Project metadata persistence
- [ ] Activity history tracking

## Timeline Editor - Core Features

### Clip Management

- [ ] Add clip to timeline (drag-drop from asset panel)
- [ ] Remove clip from timeline
- [ ] Move clip on timeline (drag)
- [ ] Trim clip (adjust start time)
- [ ] Trim clip (adjust end time)
- [ ] Trim with minimum duration validation
- [ ] Split clip at playhead position
- [ ] Duplicate clip
- [ ] Copy clip within project
- [ ] Paste clip (auto-position)
- [ ] Copy clip between projects
- [ ] Paste clip in different project

### Multi-Track System

- [ ] Create multiple tracks (video, audio, image)
- [ ] Lock/unlock track
- [ ] Mute track
- [ ] Solo track
- [ ] Adjust track height
- [ ] Reorder tracks
- [ ] Delete track

### Playback

- [ ] Play video
- [ ] Pause video
- [ ] Stop playback
- [ ] Scrub playhead
- [ ] Jump to timecode
- [ ] Playback speed adjustment (0.25x to 4x)
- [ ] Multi-track audio sync
- [ ] Loop playback
- [ ] Frame-by-frame navigation

### Selection & Grouping

- [ ] Select single clip
- [ ] Multi-select clips (Shift+click)
- [ ] Select all (Cmd/Ctrl+A)
- [ ] Deselect (Cmd/Ctrl+D)
- [ ] Group clips
- [ ] Ungroup clips
- [ ] Lock clip/group
- [ ] Unlock clip/group
- [ ] Color-tag clip for organization

### Timeline UI

- [ ] Zoom in/out
- [ ] Zoom to fit
- [ ] Snap-to-grid
- [ ] Enable/disable guides
- [ ] Add/remove markers
- [ ] Markers at clip boundaries
- [ ] Timeline ruler with accurate timecode
- [ ] Minimap for navigation
- [ ] Pan horizontally

## Effects & Corrections

### Video Effects

- [ ] Adjust brightness (0-200)
- [ ] Adjust contrast (0-200)
- [ ] Adjust saturation (0-200)
- [ ] Adjust hue (0-360 degrees)
- [ ] Apply blur effect (0-20 pixels)
- [ ] Crop rectangle selection
- [ ] Crop preview before apply

### Audio Effects

- [ ] Adjust volume (-60 to +12 dB)
- [ ] Mute audio
- [ ] Fade in duration
- [ ] Fade out duration
- [ ] Bass EQ gain (-12 to +12 dB)
- [ ] Mid EQ gain (-12 to +12 dB)
- [ ] Treble EQ gain (-12 to +12 dB)
- [ ] Compression (0-100)
- [ ] Auto-normalize to -3dB

### Transformations

- [ ] Rotation (0-360 degrees)
- [ ] Horizontal flip
- [ ] Vertical flip
- [ ] Scale (0.1x to 3x)

### Per-Clip Properties

- [ ] Set opacity (0-1)
- [ ] Set volume (0-2)
- [ ] Set playback speed (0.25x to 4x)
- [ ] Toggle mute flag

## Transitions

- [ ] Apply crossfade transition
- [ ] Apply fade-in transition
- [ ] Apply fade-out transition
- [ ] Apply slide-left transition
- [ ] Apply slide-right transition
- [ ] Apply slide-up transition
- [ ] Apply slide-down transition
- [ ] Apply wipe-left transition
- [ ] Apply wipe-right transition
- [ ] Apply zoom-in transition
- [ ] Apply zoom-out transition
- [ ] Adjust transition duration
- [ ] Preview transition
- [ ] Remove transition (cut)

## Text Overlays

- [ ] Add text overlay
- [ ] Edit text content
- [ ] Change font family
- [ ] Change font size
- [ ] Change text color
- [ ] Adjust text opacity
- [ ] Add text shadow
- [ ] Add text outline
- [ ] Position text on canvas
- [ ] Adjust text duration
- [ ] Remove text overlay
- [ ] Multiple overlays on timeline

## Asset Management

### Upload & Import

- [ ] Upload video file
- [ ] Upload audio file
- [ ] Upload image file
- [ ] Drag-drop upload (single)
- [ ] Drag-drop upload (multiple)
- [ ] Upload progress indicator
- [ ] Supported formats validation
- [ ] File size limits

### Asset Organization

- [ ] View asset thumbnail
- [ ] Preview asset (play)
- [ ] Asset name/description
- [ ] Tag assets
- [ ] Filter by type (video/audio/image)
- [ ] Search assets by name
- [ ] Sort assets by date

### Asset Processing

- [ ] Auto-generate thumbnail
- [ ] Display audio waveform
- [ ] Scene detection (auto-split)
- [ ] Scene detection accuracy
- [ ] Extract audio from video
- [ ] Upscale video (2x, 4x)
- [ ] Upscale status polling

### Asset Versioning

- [ ] Create asset version
- [ ] List asset versions
- [ ] Revert to previous version
- [ ] Version timestamps
- [ ] Delete old versions

### Asset Deletion

- [ ] Delete asset (with confirmation)
- [ ] Cannot delete used asset
- [ ] Recover deleted asset (if backed up)

## AI Video Generation

### Generation Setup

- [ ] Select video model (Veo, FAL.ai, MiniMax)
- [ ] Enter text prompt (3-1000 chars)
- [ ] Validate prompt length
- [ ] Select aspect ratio (16:9, 9:16, 1:1, 4:3, 3:4)
- [ ] Select duration
- [ ] Enter negative prompt
- [ ] Configure person generation
- [ ] Enable/disable audio generation (Veo only)

### Advanced Parameters

- [ ] Set random seed
- [ ] Reproducible generation (same seed)
- [ ] Generate variations (1-4 samples)
- [ ] Select resolution (480p, 720p, 1080p)
- [ ] Prompt enhancement toggle

### Generation Process

- [ ] Submit generation job
- [ ] Status polling updates
- [ ] Generation progress percentage
- [ ] Generation timeout handling
- [ ] Pause/resume generation
- [ ] Cancel generation
- [ ] Download generated video to assets
- [ ] Add to timeline after generation
- [ ] Multiple generation queue

### Image-to-Video

- [ ] Select image as first frame
- [ ] Upload custom image
- [ ] Preview image
- [ ] Generate video from image

## AI Audio Generation

### Text-to-Speech

- [ ] Select TTS voice
- [ ] Preview voice
- [ ] Generate speech from text
- [ ] Adjust voice stability
- [ ] Adjust voice clarity
- [ ] Language selection
- [ ] Add to timeline

### Music Generation

- [ ] Enter music description
- [ ] Select style/genre
- [ ] Set duration
- [ ] Set musical key
- [ ] Set tempo
- [ ] Generate music variations
- [ ] Status polling

### Sound Effects

- [ ] Enter SFX description
- [ ] Set duration
- [ ] Generate SFX variations
- [ ] Add to audio track

### Voice Selection

- [ ] List available voices
- [ ] Preview voice samples
- [ ] Voice language support
- [ ] Voice filtering

## AI Image Generation

- [ ] Enter image prompt
- [ ] Select Imagen model
- [ ] Set image count (1-4)
- [ ] Select safety filter level
- [ ] Choose output format (PNG/JPEG)
- [ ] Set random seed
- [ ] Generate images
- [ ] Status polling
- [ ] Add to assets

## Keyframe Animation

- [ ] Open keyframe editor
- [ ] Upload base image
- [ ] Create position keyframe
- [ ] Create scale keyframe
- [ ] Create rotation keyframe
- [ ] Create opacity keyframe
- [ ] Adjust keyframe timing
- [ ] Edit easing curves
- [ ] Preview animation
- [ ] Generate variations
- [ ] View version gallery
- [ ] Select best version
- [ ] Export to timeline

## Export & Rendering

### Export Setup

- [ ] Open export dialog
- [ ] Select platform preset (YouTube, Instagram, etc.)
- [ ] Custom export settings
- [ ] Set resolution (width/height)
- [ ] Set frame rate (FPS)
- [ ] Set video bitrate
- [ ] Set audio bitrate
- [ ] Select format (MP4/WebM)
- [ ] Select video codec (H.264, H.265, VP8, VP9, AV1)
- [ ] Select audio codec (AAC, MP3, Opus, Vorbis)

### Export Presets

- [ ] Create custom export preset
- [ ] Save preset for reuse
- [ ] List saved presets
- [ ] Update preset
- [ ] Delete preset
- [ ] Platform-specific presets (YouTube 1080p, Instagram Reels, etc.)

### Export Job Management

- [ ] Submit export job
- [ ] Monitor job status
- [ ] Pause export job
- [ ] Resume export job
- [ ] Adjust job priority
- [ ] View job queue
- [ ] Export timeout handling
- [ ] Download exported video
- [ ] Export failure recovery

## Undo/Redo & History

- [ ] Undo single action
- [ ] Redo single action
- [ ] Undo multiple actions (history stack)
- [ ] Redo multiple actions
- [ ] Keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Y)
- [ ] History limit (50 actions)
- [ ] Clear history
- [ ] History per-clip debouncing
- [ ] Undo after collaborator changes

## Clipboard Operations

- [ ] Copy clip (Cmd/Ctrl+C)
- [ ] Paste clip (Cmd/Ctrl+V)
- [ ] Copy multiple clips
- [ ] Paste in different position
- [ ] Paste in different project
- [ ] Paste preserves properties (effects, transitions)
- [ ] Clipboard timeout

## Collaboration & Sharing

### Email Invites

- [ ] Send email invite
- [ ] Set collaborator role (Editor/Viewer)
- [ ] Invite validation
- [ ] Invite expiration
- [ ] Revoke pending invite
- [ ] Resend invite
- [ ] Accept invite via email link
- [ ] Reject invite

### Share Links

- [ ] Generate share link
- [ ] Set role for share link (Editor/Viewer)
- [ ] Set expiration date
- [ ] Set max uses
- [ ] Copy share link
- [ ] Share link token validation
- [ ] Disable share link
- [ ] Delete share link
- [ ] Share link access without login

### Direct Collaborators

- [ ] Add existing user as collaborator
- [ ] Change collaborator role
- [ ] Remove collaborator
- [ ] List collaborators
- [ ] Collaborator last-seen timestamp
- [ ] Online status indicator

### Permissions

- [ ] Owner has full control
- [ ] Editor can modify project
- [ ] Viewer can only view
- [ ] Viewer cannot save changes
- [ ] Role enforcement
- [ ] Prevent unauthorized edits

## Project Templates

- [ ] Save project as template
- [ ] Set template visibility (public/private)
- [ ] Add template tags
- [ ] Template categories
- [ ] List templates
- [ ] Filter templates by category
- [ ] Search templates
- [ ] Featured templates
- [ ] Create project from template
- [ ] Duplicate template
- [ ] Delete template

## Backups & Restoration

- [ ] Auto-backup creation
- [ ] Manual backup creation
- [ ] List backups
- [ ] Backup timestamps
- [ ] Backup size
- [ ] Restore from backup
- [ ] Confirm restore
- [ ] Project state after restore
- [ ] Delete old backup
- [ ] Backup frequency

## Project Activity

- [ ] View activity log
- [ ] Filter activity by user
- [ ] Filter activity by action type
- [ ] Activity timestamps
- [ ] Collaborator activity
- [ ] Asset modification tracking
- [ ] Export job history

## AI Assistant Chat

- [ ] Open AI chat
- [ ] Send message
- [ ] Receive Gemini response
- [ ] Chat history persistence
- [ ] Clear chat history
- [ ] Context-aware responses
- [ ] Chat on desktop (sidebar)
- [ ] Chat on mobile (bottom drawer)
- [ ] Chat collapse/expand

## Settings & Account

### Password Management

- [ ] Change password
- [ ] Confirm new password
- [ ] Password strength validation
- [ ] Session invalidation after change

### Subscription Management

- [ ] View current subscription tier
- [ ] Upgrade to Premium
- [ ] Stripe checkout integration
- [ ] Subscription confirmation
- [ ] Access billing portal
- [ ] Cancel subscription
- [ ] Subscription status display

### Activity History

- [ ] View user activity
- [ ] Filter by date range
- [ ] Export activity

### Keyboard Shortcuts

- [ ] View shortcuts list
- [ ] Search shortcuts
- [ ] Customizable shortcuts
- [ ] Import/export shortcuts

### Theme Toggle

- [ ] Light mode
- [ ] Dark mode
- [ ] Auto-detection
- [ ] Theme persistence

### User Preferences

- [ ] Auto-save toggle
- [ ] Default playback speed
- [ ] Grid snap settings
- [ ] Audio preview volume
- [ ] Export defaults

## Admin Features

- [ ] Access admin dashboard (admin tier only)
- [ ] View all users
- [ ] Change user tier (Free/Premium/Admin)
- [ ] Delete user (with confirmation)
- [ ] View user statistics
- [ ] Clear system cache
- [ ] System health monitoring

## Security & Authorization

### Authentication

- [ ] Supabase auth integration
- [ ] Session management
- [ ] CSRF protection
- [ ] Secure password storage
- [ ] Email confirmation (if enabled)
- [ ] Two-factor authentication (if available)

### Authorization

- [ ] Row-Level Security (RLS) enforcement
- [ ] Project ownership verification
- [ ] Collaborator permission enforcement
- [ ] Admin-only endpoints
- [ ] Rate limiting

### Data Protection

- [ ] Signed URLs for asset access
- [ ] Secure asset storage
- [ ] Data encryption in transit
- [ ] Data encryption at rest (database)

## Performance & Optimization

- [ ] Timeline responsiveness with 100+ clips
- [ ] Smooth playback without stuttering
- [ ] Zoom performance
- [ ] Clip rendering (virtualization)
- [ ] Memory usage under load
- [ ] Network request optimization
- [ ] Asset caching
- [ ] Lazy component loading
- [ ] Auto-save debouncing

## Error Handling & Recovery

- [ ] Network error recovery
- [ ] Failed upload recovery
- [ ] Generation timeout handling
- [ ] Export failure messages
- [ ] Collaborator conflict resolution
- [ ] Corrupted project recovery
- [ ] Clear error messages
- [ ] Retry mechanisms

## Browser Compatibility

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] WebGL support
- [ ] Canvas API support

## Responsive Design

- [ ] Desktop layout (1920x1080)
- [ ] Laptop layout (1366x768)
- [ ] Tablet layout (iPad)
- [ ] Mobile layout (iPhone)
- [ ] Touch gestures (pinch-zoom, swipe)
- [ ] Sidebar collapse on mobile
- [ ] Modal responsiveness
- [ ] Button/control sizing

## Accessibility

- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] ARIA labels
- [ ] Focus management
- [ ] Color contrast
- [ ] High contrast mode
- [ ] Zoom/text size adjustments

## API Testing

### Project Endpoints

- [ ] POST /api/projects (create)
- [ ] GET /api/projects (list)
- [ ] GET /api/projects/[projectId] (read)
- [ ] PUT /api/projects/[projectId] (update)
- [ ] DELETE /api/projects/[projectId] (delete)

### Asset Endpoints

- [ ] POST /api/assets/upload (upload)
- [ ] GET /api/assets (list)
- [ ] POST /api/assets/sign (get signed URL)
- [ ] PUT /api/assets/[assetId]/update (update)
- [ ] DELETE /api/assets/[assetId] (delete)
- [ ] PUT /api/assets/[assetId]/tags (update tags)
- [ ] GET /api/assets/[assetId]/versions (list versions)
- [ ] PUT /api/assets/[assetId]/versions/[versionId]/revert (revert)

### Video Generation

- [ ] POST /api/video/generate (submit job)
- [ ] GET /api/video/status (poll status)
- [ ] POST /api/video/upscale (upscale video)
- [ ] POST /api/video/split-scenes (scene detection)
- [ ] POST /api/video/split-audio (extract audio)

### Audio Generation

- [ ] POST /api/audio/elevenlabs/generate (TTS)
- [ ] GET /api/audio/elevenlabs/voices (list voices)
- [ ] POST /api/audio/elevenlabs/sfx (SFX)
- [ ] POST /api/audio/suno/generate (music)
- [ ] GET /api/audio/suno/status (music status)

### Export Endpoints

- [ ] POST /api/export (create job)
- [ ] GET /api/export/queue (list jobs)
- [ ] GET /api/export/queue/[jobId] (get status)
- [ ] PATCH /api/export/queue/[jobId]/pause (pause)
- [ ] PATCH /api/export/queue/[jobId]/resume (resume)
- [ ] PATCH /api/export/queue/[jobId]/priority (adjust priority)

### Collaboration Endpoints

- [ ] GET /api/projects/[projectId]/collaborators (list)
- [ ] POST /api/projects/[projectId]/collaborators (add)
- [ ] DELETE /api/projects/[projectId]/collaborators/[id] (remove)
- [ ] PUT /api/projects/[projectId]/collaborators/[id] (update role)
- [ ] POST /api/projects/[projectId]/invites (send invite)
- [ ] POST /api/projects/[projectId]/invites/[inviteId] (accept)
- [ ] POST /api/projects/[projectId]/share-links (create link)
- [ ] PUT /api/projects/[projectId]/share-links/[linkId] (update)
- [ ] DELETE /api/projects/[projectId]/share-links/[linkId] (delete)
- [ ] POST /api/join/[token] (accept share link)

### Chat Endpoints

- [ ] POST /api/projects/[projectId]/chat (send message)
- [ ] GET /api/projects/[projectId]/chat (get history)
- [ ] DELETE /api/projects/[projectId]/chat (clear)
- [ ] POST /api/projects/[projectId]/chat/messages (send)

### Backup Endpoints

- [ ] GET /api/projects/[projectId]/backups (list)
- [ ] POST /api/projects/[projectId]/backups (create)
- [ ] POST /api/projects/[projectId]/backups/[id]/restore (restore)
- [ ] DELETE /api/projects/[projectId]/backups/[id] (delete)

### Rate Limiting

- [ ] Verify rate limit headers
- [ ] Test rate limit enforcement
- [ ] Test different rate limit tiers
- [ ] Recovery after rate limit

---

## Testing Categories Summary

| Category            | Test Count | Critical |
| ------------------- | ---------- | -------- |
| Authentication      | 10         | Yes      |
| Project Management  | 7          | Yes      |
| Timeline Editor     | 60+        | Yes      |
| Effects             | 30+        | Yes      |
| Transitions         | 12         | Yes      |
| Text Overlays       | 10         | Medium   |
| Asset Management    | 25+        | Yes      |
| AI Video Generation | 20+        | Yes      |
| AI Audio Generation | 20+        | Medium   |
| AI Image Generation | 10         | Medium   |
| Keyframe Animation  | 10         | Medium   |
| Export              | 20+        | Yes      |
| Undo/Redo           | 10         | Yes      |
| Collaboration       | 25+        | Yes      |
| Templates           | 10         | Medium   |
| Backups             | 8          | Yes      |
| Settings            | 15+        | Medium   |
| Admin               | 5          | Medium   |
| Security            | 10+        | Yes      |
| Performance         | 10         | Medium   |
| API                 | 61+        | Yes      |
| Browser Compat      | 8          | Medium   |
| Responsive          | 8          | Medium   |
| Accessibility       | 7          | Medium   |

**Total Tests: 500+**

---

## Testing Priority

### Phase 1 (Critical - Must Pass)

1. Authentication flows
2. Project CRUD
3. Timeline editing core
4. Playback
5. Asset upload
6. Export functionality
7. Collaboration (sharing)
8. API endpoints

### Phase 2 (High - Should Pass)

1. Effects and corrections
2. Transitions
3. AI generation (video/audio)
4. Undo/redo
5. Backups/restore
6. Admin features
7. Rate limiting

### Phase 3 (Medium - Nice to Pass)

1. Keyframe animation
2. Text overlays
3. Advanced effects
4. Performance optimization
5. Accessibility
6. Browser compatibility
7. Mobile responsiveness
