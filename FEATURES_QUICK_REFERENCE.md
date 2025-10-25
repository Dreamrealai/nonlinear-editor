# Non-Linear Video Editor - Quick Reference Guide

## Feature Categories Summary

| Category           | Files | Feature Count | Priority |
| ------------------ | ----- | ------------- | -------- |
| Core Editing       | 30+   | 45+           | Critical |
| Project Management | 20+   | 25+           | Critical |
| Asset Pipeline     | 15+   | 30+           | High     |
| Media Generation   | 25+   | 20+           | High     |
| Export & Rendering | 10+   | 15+           | High     |
| UI Components      | 50+   | 40+           | Medium   |
| Collaboration      | 10+   | 8+            | Medium   |
| Settings & Auth    | 15+   | 20+           | Medium   |
| Accessibility      | 5+    | 10+           | Medium   |

---

## Core Features at a Glance

### Timeline Management

**Files:** `useTimelineStore.ts`, `timeline/` components
**Key Testable Actions:**

- Add clip to timeline
- Remove clip from timeline
- Reorder clips
- Trim clip duration
- Split clip at time
- Add marker
- Lock/unlock track
- Toggle track solo/mute

### Clip Effects

**Files:** `corrections/` components, `timeline.ts`
**Video Effects:** brightness, contrast, saturation, hue, blur (5 effects)
**Audio Effects:** volume, fade in/out, EQ (3-band), compression, normalize (7 effects)
**Transform:** rotation, flip H/V, scale (4 effects)

### Text Overlays

**Files:** `TextOverlayEditor.tsx`, `useTimelineStore.ts`
**Animations:** 19 animation types including fade, slide, scale, rotate, typewriter
**Properties:** Position, font size, color, background, opacity, alignment

### Transitions

**Files:** `ClipPropertiesPanel.tsx`
**Types:** fade-in/out/crossfade, slide (4 directions), wipe (2 directions), zoom (2 directions), none (11 total)

---

## Project Management Summary

| Feature        | Location                            | Testable                |
| -------------- | ----------------------------------- | ----------------------- |
| Create Project | `/app/api/projects/route.ts`        | Yes                     |
| Save/Load      | `/lib/saveLoad.ts`                  | Yes                     |
| Undo/Redo      | `useHistoryStore.ts`                | Yes (50 action limit)   |
| Import/Export  | `projectExportImport.ts`            | Yes (JSON, EDL, FCPXML) |
| Backup/Restore | `backupService.ts`                  | Yes                     |
| Collaborators  | `/app/api/projects/[projectId]/...` | Yes                     |

---

## Asset Pipeline Features

| Feature       | Component                 | Testable                    |
| ------------- | ------------------------- | --------------------------- |
| Upload        | `AssetPanel.tsx`          | Single & batch upload       |
| Search/Filter | `AssetPanel.tsx`          | By type, name, usage, tags  |
| Sort          | `AssetPanel.tsx`          | By date, name, size, type   |
| Pagination    | `useAssetList.ts`         | Next/previous page          |
| Versions      | `AssetVersionHistory.tsx` | View, compare, revert       |
| Thumbnails    | `thumbnailService.ts`     | Auto-generation, extraction |

**Supported Formats:**

- Video: MP4, WebM, MOV, AVI
- Audio: MP3, WAV, OGG, M4A
- Image: JPEG, PNG, WebP, GIF

---

## Media Generation Providers

### Video Generation

- **Providers:** Runway ML, Replicate, Hugging Face
- **Parameters:** Prompt, duration (15-120s), aspect ratio, model, seed
- **Components:** GenerateVideoTab.tsx, VideoGenerationForm.tsx, VideoGenerationQueue.tsx

### Image Generation

- **Providers:** Google Imagen, DALL-E, Stable Diffusion
- **Parameters:** Prompt, negative prompt, aspect ratio, model, quality
- **Components:** GenerateImageTab.tsx

### Audio Generation

- **Music:** Suno (prompt-based)
- **Voice:** ElevenLabs (TTS with voice selection)
- **SFX:** ElevenLabs (sound effects)
- **Components:** GenerateAudioTab.tsx, AudioTypeSelector.tsx, MusicGenerationForm.tsx, etc.

### Video Processing

- Scene detection
- Audio extraction
- Audio description generation
- Upscaling (2x, 4x)

---

## Export Features

### Formats & Presets

```
MP4 (H.264)     - Default format
WebM (VP8/VP9)  - Web format

YouTube:        1080p, 4K, Shorts
Instagram:      Feed, Story, Reel
TikTok:         1080x1920, 30fps
Twitter:        1280x720, 30fps
Facebook:       1920x1080, 30fps
LinkedIn:       1920x1080, 30fps
Custom:         User-defined
```

### Export Parameters

- Resolution: 1280-4096px width/height
- Frame rate: 24, 25, 30, 60 fps
- Video bitrate: 1000-50000 Kbps
- Audio bitrate: 64-320 Kbps

---

## UI Components Summary

### Timeline Area

```
┌─────────────────────────────┐
│ TimelineRuler               │ (Time display)
├─────────────────────────────┤
│ TimelineClipRenderer        │ (Clips)
│ TimelineTextOverlayRenderer │ (Text overlays)
│ TimelineTracks              │ (Track headers)
├─────────────────────────────┤
│ TimelineMarkers             │ (Bookmarks)
│ TimelineSnapGuides          │ (Alignment guides)
│ TimelineSelectionRectangle  │ (Rubber-band select)
├─────────────────────────────┤
│ PlaybackControls            │ (Play, pause, seek)
│ TimelineMinimap             │ (Overview)
└─────────────────────────────┘
```

### Main Layout

```
┌─────────────────────────────────────┐
│ EditorHeader (tabs, settings)       │
├────────────┬───────────────┬────────┤
│ AssetPanel │  Preview +    │Clip    │
│ (library)  │  Timeline     │Props   │
│            │               │Panel   │
├────────────┴───────────────┴────────┤
│ PlaybackControls, Zoom, Grid       │
└─────────────────────────────────────┘
```

---

## Keyboard Shortcuts

### Editing

- **Ctrl+Z / Cmd+Z:** Undo
- **Ctrl+Shift+Z / Cmd+Shift+Z:** Redo
- **Ctrl+C / Cmd+C:** Copy
- **Ctrl+X / Cmd+X:** Cut
- **Ctrl+V / Cmd+V:** Paste
- **Ctrl+D / Cmd+D:** Duplicate
- **Delete:** Delete selected
- **Ctrl+A / Cmd+A:** Select all

### Playback

- **Space:** Play/Pause
- **Arrow Keys:** Navigate timeline
- **+/-:** Zoom in/out

### Help

- **Ctrl+? / Cmd+?:** Show shortcuts help

---

## Database Schema (Essential Tables)

### Core Tables

| Table         | Rows | Purpose             |
| ------------- | ---- | ------------------- |
| projects      | UUID | User projects       |
| assets        | UUID | Media files         |
| timelines     | UUID | Timeline state      |
| chat_messages | UUID | Chat history        |
| scene_frames  | UUID | Extracted keyframes |
| frame_edits   | UUID | AI-edited frames    |

### Storage Buckets

| Bucket      | Size  | Purpose         |
| ----------- | ----- | --------------- |
| assets      | 500MB | Uploaded media  |
| frames      | 50MB  | Keyframe images |
| frame-edits | 100MB | Edited frames   |

---

## API Routes (By Category)

### Projects (6 endpoints)

```
GET    /api/projects
POST   /api/projects
GET    /api/projects/[projectId]
PUT    /api/projects/[projectId]
DELETE /api/projects/[projectId]
GET    /api/projects/[projectId]/activity
```

### Assets (8 endpoints)

```
GET    /api/assets
POST   /api/assets
POST   /api/assets/upload
POST   /api/assets/sign
GET    /api/assets/[assetId]/thumbnail
PUT    /api/assets/[assetId]/update
PUT    /api/assets/[assetId]/tags
GET    /api/assets/[assetId]/versions
```

### Generation (12 endpoints)

```
POST   /api/video/generate
GET    /api/video/status
POST   /api/video/upscale
GET    /api/video/upscale-status
POST   /api/video/split-scenes
POST   /api/video/split-audio
POST   /api/video/generate-audio
GET    /api/video/generate-audio-status
POST   /api/image/generate
POST   /api/audio/suno/generate
GET    /api/audio/suno/status
POST   /api/audio/elevenlabs/generate
```

### Export (8 endpoints)

```
POST   /api/export
GET    /api/export/queue
GET    /api/export/queue/[jobId]
POST   /api/export/queue/[jobId]/pause
POST   /api/export/queue/[jobId]/resume
POST   /api/export/queue/[jobId]/priority
GET    /api/export-presets
POST   /api/export-presets
```

### Collaboration (7 endpoints)

```
GET    /api/projects/[projectId]/invites
POST   /api/projects/[projectId]/invites
GET    /api/projects/[projectId]/collaborators
POST   /api/projects/[projectId]/collaborators
GET    /api/projects/[projectId]/chat
POST   /api/projects/[projectId]/chat/messages
DELETE /api/projects/[projectId]/chat
```

### Backup (4 endpoints)

```
GET    /api/projects/[projectId]/backups
POST   /api/projects/[projectId]/backups
POST   /api/projects/[projectId]/backups/[backupId]/restore
DELETE /api/projects/[projectId]/backups/[backupId]
```

---

## State Management (Zustand Stores)

```
useTimelineStore
├── timeline: Timeline | null
├── setTimeline(timeline)
├── addClip(clip)
├── updateClip(id, patch)
├── removeClip(id)
├── reorderClips(ids)
├── splitClipAtTime(id, time)
├── addMarker(marker)
├── addTextOverlay(overlay)
├── addTransitionToClips(ids, type, duration)
└── lockClip/unlockClip/toggleClipLock

usePlaybackStore
├── currentTime: number
├── zoom: number
├── isPlaying: boolean
├── setCurrentTime(time)
├── setZoom(zoom)
├── play()
├── pause()
└── togglePlayPause()

useSelectionStore
├── selectedClipIds: Set<string>
├── selectClip(id)
├── deselectClip(id)
├── selectMultiple(ids)
└── clearSelection()

useHistoryStore
├── past: Timeline[]
├── future: Timeline[]
├── push(timeline)
├── undo()
└── redo()
```

---

## Testing Priorities

### Must Test First (Critical Path)

1. Project creation and loading
2. Clip add/remove/trim operations
3. Timeline save and load
4. Asset upload and library
5. Playback controls
6. Undo/redo functionality

### Should Test Early (Core Features)

7. Clip effects (video, audio, transform)
8. Text overlays with animations
9. Transitions between clips
10. Export to video file
11. Multi-track support
12. Keyboard shortcuts

### Test Later (Nice-to-Have)

13. Media generation (AI features)
14. Collaboration/sharing
15. Project import/export formats
16. Advanced animations and effects
17. Asset versioning
18. Backup and recovery

---

## Performance Metrics

### Caching Strategy

- Project metadata: 2 minute TTL
- Asset list: 5 minute TTL
- Timeline data: 1 minute TTL
- Signed URLs: 1 hour TTL

### Rate Limits (per user)

- TIER 1: 100 req/min (expensive ops)
- TIER 2: 300 req/min (moderate ops)
- TIER 3: 600 req/min (read ops)
- TIER 4: 1000 req/min (light ops)

### History

- Max 50 undo/redo steps
- 300ms debounce per clip edit

---

## Accessibility Features

- **Screen Reader Support:** ARIA labels throughout
- **Keyboard Navigation:** Full keyboard control
- **Color Contrast:** WCAG AA compliant
- **Focus Indicators:** Visible on all interactive elements
- **Semantic HTML:** Proper heading hierarchy
- **Testing:** Automated axe-core + Lighthouse audits

---

## File Organization

```
/app                      - Next.js app directory
├── editor/               - Editor pages
├── api/                  - API routes (60+ endpoints)
└── [auth pages]         - Sign in, sign up, etc.

/components              - React components (94 files)
├── timeline/            - Timeline UI (16 components)
├── editor/              - Editor panels (12 components)
├── generation/          - Generation UI (14 components)
├── keyframes/           - Keyframe editor (5 components)
├── ui/                  - Reusable UI (15 components)
└── [other modules]

/lib                      - Utilities and services
├── services/            - Business logic (15 services)
├── hooks/               - Custom hooks (20+ hooks)
├── utils/               - Utility functions (30+ utils)
├── api/                 - API helpers (10+ helpers)
└── [config, validation]

/state                    - Zustand stores (6 stores)
/types                    - TypeScript types (8 files)
/supabase                 - Database schema
└── migrations/

/__tests__               - Jest test files
/e2e                     - Playwright tests
```

---

## Quick Start Testing

### 1. Timeline Operations (5 min)

```bash
1. Create new project
2. Add video clip
3. Trim clip
4. Split clip
5. Add text overlay
```

### 2. Asset Management (5 min)

```bash
1. Upload video file
2. Search for asset
3. Filter by type
4. Sort by date
5. Add to timeline
```

### 3. Export (5 min)

```bash
1. Configure output settings
2. Load preset
3. Start export
4. Check progress
5. Download result
```

### 4. Effects & Properties (5 min)

```bash
1. Select clip
2. Add video effect
3. Add audio effect
4. Add transition
5. Preview changes
```

### 5. Playback (3 min)

```bash
1. Play/pause
2. Seek to time
3. Change speed
4. Adjust volume
5. View timeline
```

---

## Common Test Scenarios

### Scenario 1: Simple Video Edit

```
1. Create project
2. Upload video
3. Add to timeline
4. Trim to 30 seconds
5. Add transition
6. Export as MP4
```

### Scenario 2: Multi-Track Edit

```
1. Create project
2. Upload video + audio
3. Add to separate tracks
4. Apply effects to each
5. Add text overlay
6. Export with all tracks
```

### Scenario 3: Text & Animation

```
1. Create project
2. Upload background video
3. Add text overlay at 5s
4. Apply fade-in animation
5. Configure animation duration
6. Preview animation
7. Export
```

### Scenario 4: Asset Library

```
1. Create project
2. Upload 10 assets
3. Search for specific asset
4. Filter by type
5. Sort by date
6. Mark as favorite
7. Add tag
8. Filter by tag
```

### Scenario 5: Generation Pipeline

```
1. Create project
2. Generate video with AI
3. Wait for completion
4. Add to timeline
5. Generate audio
6. Add to audio track
7. Export final result
```

---

## Common Issues & Solutions

| Issue               | Solution            | File                    |
| ------------------- | ------------------- | ----------------------- |
| Clip won't move     | Check if locked     | useTimelineStore.ts     |
| Timeline not saving | Check auth          | saveLoad.ts             |
| Asset upload fails  | Check file size     | assetService.ts         |
| Effect not applying | Check clip selected | ClipPropertiesPanel.tsx |
| Export won't start  | Check output spec   | exportRoute.ts          |
| Undo not working    | Check history size  | useHistoryStore.ts      |
| Playback stalling   | Check cache         | cache.ts                |
| Permission denied   | Check RLS policies  | schema.sql              |

---

## Environment Requirements

- **Node.js:** >= 18.18.0, < 23.0.0
- **npm:** >= 9.0.0
- **Browser:** Chrome, Firefox, Safari (latest)
- **Supabase:** Configured with auth
- **Storage:** Google Cloud Storage or compatible

---

## Configuration Files

| File                   | Purpose                           |
| ---------------------- | --------------------------------- |
| `.env.local`           | Environment variables (local dev) |
| `.env.example`         | Example env variables             |
| `package.json`         | Dependencies and scripts          |
| `tsconfig.json`        | TypeScript configuration          |
| `tailwind.config.ts`   | Tailwind CSS setup                |
| `next.config.ts`       | Next.js configuration             |
| `jest.config.js`       | Jest testing setup                |
| `playwright.config.ts` | E2E testing setup                 |

---

## Build & Deployment

### Development

```bash
npm run dev              # Start dev server
npm run build            # Build production
npm run type-check       # TypeScript check
npm run lint            # ESLint check
npm run format          # Prettier format
```

### Testing

```bash
npm run test            # Jest tests
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright tests
npm test:e2e:ui        # E2E with UI
```

### Validation

```bash
npm run validate        # Type + lint + format
npm run validate:env    # Environment check
npm run check:env       # Env script check
```

---

## Learning Resources

**Documentation:**

- `/docs/CODING_BEST_PRACTICES.md` - Code patterns
- `/docs/STYLE_GUIDE.md` - Code formatting
- `/docs/ARCHITECTURE_OVERVIEW.md` - System design
- `/docs/SERVICE_LAYER_GUIDE.md` - Service patterns
- `/docs/api/` - API documentation

**Related Files:**

- `CLAUDE.md` - Project instructions
- `FEATURES_COMPREHENSIVE.md` - Complete feature list
- `README.md` - General overview
