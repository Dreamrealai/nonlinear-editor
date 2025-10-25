# Features Documentation

**Complete feature inventory and quick reference for the Non-Linear Video Editor.**

Last Updated: 2025-10-25
Maintained by: Engineering Team

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Core Editing Features](#core-editing-features)
3. [AI Generation Features](#ai-generation-features)
4. [Asset Management](#asset-management)
5. [Export & Rendering](#export--rendering)
6. [User Management](#user-management)
7. [Feature Status](#feature-status)

---

## Quick Reference

### Available Features

✅ **Fully Implemented** | 🚧 **In Progress** | 📋 **Planned**

**Core Editing:**

- ✅ Multi-track timeline
- ✅ Clip trimming & splitting
- ✅ Transitions (crossfade, fade)
- ✅ Volume & opacity controls
- ✅ Playback speed adjustment
- ✅ Keyboard shortcuts
- ✅ Undo/Redo

**AI Generation:**

- ✅ AI video generation (Kling, Minimax, Pixverse)
- ✅ AI audio generation (Suno, ElevenLabs)
- ✅ AI image generation (Imagen)
- 🚧 Text-to-speech
- 📋 Voice cloning

**Assets:**

- ✅ Video/audio/image upload
- ✅ Asset library management
- ✅ Cloud storage (Supabase)
- ✅ Asset preview
- ✅ Metadata extraction

**Export:**

- ✅ MP4 export
- ✅ Quality presets
- ✅ Custom resolution
- 🚧 Background processing
- 📋 Batch export

**Collaboration:**

- ✅ User authentication
- ✅ Project sharing
- 📋 Real-time collaboration
- 📋 Comments & annotations

---

## Core Editing Features

### Timeline Management

**Location:** `/components/timeline/`, `/state/useTimelineStore.ts`

**Features:**

- Multi-track timeline (unlimited tracks)
- Drag-and-drop clip positioning
- Zoom controls (0.1x - 10x)
- Grid snapping
- Playhead scrubbing
- Timeline markers
- Track muting/soloing
- Track locking

**Usage:**

```typescript
import { useTimelineStore } from '@/state/useTimelineStore';

const { clips, addClip, removeClip, updateClip } = useTimelineStore();

// Add clip to timeline
addClip({
  id: 'clip-1',
  assetId: 'asset-123',
  track: 0,
  startTime: 0,
  duration: 10,
});
```

### Clip Operations

**Location:** `/lib/utils/timelineUtils.ts`

**Features:**

- Trim clips (adjust in/out points)
- Split clips at playhead
- Duplicate clips
- Adjust playback speed (0.25x - 4x)
- Crop rectangles
- Volume control (0-200%)
- Opacity control (0-100%)

**Keyboard Shortcuts:**

- `Space` - Play/Pause
- `Cmd+K` - Split clip at playhead
- `Delete` - Remove selected clip
- `Cmd+D` - Duplicate clip
- `Cmd+Z` - Undo
- `Cmd+Shift+Z` - Redo

### Transitions

**Location:** `/components/timeline/TransitionControls.tsx`

**Available Transitions:**

- Crossfade (duration: 0.5s - 5s)
- Fade in
- Fade out
- Dissolve

**Usage:**

```typescript
addTransition({
  type: 'crossfade',
  duration: 1.0,
  clip1Id: 'clip-1',
  clip2Id: 'clip-2',
});
```

---

## AI Generation Features

### Video Generation

**Location:** `/app/api/video/generate/route.ts`

**Supported Providers:**

- **Kling** - High-quality, slower (10-15 min)
- **Minimax** - Balanced quality/speed (5-10 min)
- **Pixverse** - Fast generation (2-5 min)

**Usage:**

```typescript
const response = await fetch('/api/video/generate', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A cat playing piano',
    duration: 10,
    model: 'kling',
  }),
});

const { operationName } = await response.json();

// Poll for status
const statusResponse = await fetch(`/api/video/status/${operationName}`);
const { status, url } = await statusResponse.json();
```

### Audio Generation

**Location:** `/app/api/audio/generate/route.ts`

**Features:**

- Text-to-music generation
- Custom duration (5s - 120s)
- Style/genre selection
- Loop seamlessly

**Supported Providers:**

- **Suno** - Music generation
- **ElevenLabs** - Voice synthesis

### Image Generation

**Location:** `/app/api/image/generate/route.ts`

**Features:**

- Text-to-image
- Image-to-image
- Style transfer
- Resolution up to 2048x2048

**Provider:**

- **Google Imagen** - High-quality image generation

---

## Asset Management

### Upload & Storage

**Location:** `/app/api/assets/upload/route.ts`

**Features:**

- Multi-file upload
- Drag-and-drop interface
- Progress tracking
- Automatic metadata extraction
- Cloud storage (Supabase)
- File size limit: 1GB

**Supported Formats:**

- **Video:** MP4, MOV, AVI, WebM
- **Audio:** MP3, WAV, AAC, FLAC
- **Image:** JPG, PNG, GIF, WebP

**Usage:**

```typescript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('projectId', projectId);
formData.append('type', 'video');

const response = await fetch('/api/assets/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### Asset Library

**Location:** `/components/assets/AssetLibrary.tsx`

**Features:**

- Grid/list view
- Search & filter
- Sort by date/name/type
- Preview thumbnails
- Metadata display
- Bulk operations

---

## Export & Rendering

### Video Export

**Location:** `/app/api/export/route.ts`

**Features:**

- MP4 output format
- Quality presets (low, medium, high, ultra)
- Custom resolution
- Frame rate selection (24, 30, 60 fps)
- Audio codec selection

**Quality Presets:**
| Preset | Resolution | Bitrate | File Size (10 min) |
|--------|-----------|---------|-------------------|
| Low | 720p | 2 Mbps | ~150 MB |
| Medium | 1080p | 5 Mbps | ~375 MB |
| High | 1080p | 10 Mbps | ~750 MB |
| Ultra | 4K | 25 Mbps | ~1.875 GB |

**Usage:**

```typescript
const response = await fetch('/api/export', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: 'project-123',
    settings: {
      format: 'mp4',
      quality: 'high',
      resolution: '1920x1080',
      frameRate: 30,
    },
  }),
});
```

---

## User Management

### Authentication

**Location:** `/lib/auth/`, Supabase Auth

**Features:**

- Email/password authentication
- Social OAuth (Google, GitHub)
- Email verification
- Password reset
- Session management

### Subscription Tiers

**Location:** `/app/api/payments/`

| Tier       | Price  | Features                                         |
| ---------- | ------ | ------------------------------------------------ |
| Free       | $0/mo  | 5 projects, 10 GB storage, watermark             |
| Pro        | $19/mo | Unlimited projects, 100 GB storage, no watermark |
| Enterprise | Custom | Custom storage, priority support, API access     |

### User Preferences

**Location:** `/state/userPreferencesStore.ts`

**Preferences:**

- Theme (light/dark)
- Keyboard shortcuts customization
- Auto-save interval
- Default project settings
- Language/locale

---

## Feature Status

### Implemented ✅

- Multi-track timeline editing
- Video/audio/image upload
- AI video generation
- AI audio generation
- AI image generation
- Project management
- Asset library
- Export to MP4
- User authentication
- Subscription management
- Keyboard shortcuts
- Undo/Redo

### In Progress 🚧

- Real-time collaboration
- Background export processing
- Text-to-speech
- Advanced transitions
- Color grading tools

### Planned 📋

- Mobile app
- Offline mode
- Plugin system
- Advanced audio editing
- Voice cloning
- Batch processing
- Template marketplace
- API webhooks

---

## Additional Resources

- **[Feature Backlog](/docs/FEATURES_BACKLOG.md)** - Planned features and roadmap
- **[User Guide](/docs/user-guide/)** - User-facing feature documentation
- **[API Documentation](/docs/api/API_GUIDE.md)** - API reference
- **[Keyboard Shortcuts](/docs/KEYBOARD_SHORTCUTS.md)** - Complete shortcut list

---

**Last Updated:** 2025-10-25
**Consolidation:** Merged FEATURES_COMPREHENSIVE.md and FEATURES_QUICK_REFERENCE.md
