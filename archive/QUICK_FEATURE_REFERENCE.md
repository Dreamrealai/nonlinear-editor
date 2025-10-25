# Non-Linear Video Editor - Quick Feature Reference

## Pages at a Glance

| Route                                | Purpose                     | Auth Required    |
| ------------------------------------ | --------------------------- | ---------------- |
| `/`                                  | Home/redirect               | Yes              |
| `/signin`                            | Login                       | No               |
| `/signup`                            | Register                    | No               |
| `/forgot-password`                   | Password reset request      | No               |
| `/reset-password`                    | Password reset confirmation | No               |
| `/logout`                            | Logout                      | Yes              |
| `/settings`                          | Account management          | Yes              |
| `/admin`                             | Admin dashboard             | Yes (admin tier) |
| `/docs`                              | Documentation               | No               |
| `/api-docs`                          | API documentation           | No               |
| `/video-gen`                         | Standalone video generation | No               |
| `/audio-gen`                         | Standalone audio generation | No               |
| `/image-gen`                         | Standalone image generation | No               |
| `/editor/[projectId]`                | Main editor                 | Yes              |
| `/editor/[projectId]/timeline`       | Timeline editor             | Yes              |
| `/editor/[projectId]/generate-video` | Video generation            | Yes              |
| `/editor/[projectId]/generate-audio` | Audio generation            | Yes              |
| `/editor/[projectId]/keyframe`       | Keyframe animation          | Yes              |

## Feature Categories

### Core Editing

- Multi-track timeline (video, audio, image)
- Clip trimming, splitting, duplication
- Drag-and-drop positioning
- Copy/paste clips
- Undo/redo (50 actions)
- Zoom and snap-to-grid
- Playhead scrubbing

### Effects & Corrections

- **Video:** Brightness, contrast, saturation, hue, blur, crop
- **Audio:** Volume, EQ, compression, normalization, fade in/out
- **Transform:** Rotation, flip, scale
- **Transitions:** Crossfade, fade, slide, wipe, zoom (12 types)

### Asset Management

- Upload files (video, audio, image)
- Drag-and-drop upload
- Automatic thumbnails
- Asset versioning
- Asset tagging
- Audio waveforms
- Scene detection
- Video upscaling

### AI Generation

- **Video:** Google Veo, FAL.ai Seedance, MiniMax (text-to-video, image-to-video)
- **Audio:** ElevenLabs TTS, Suno music, ElevenLabs SFX
- **Image:** Google Imagen 3

### Advanced Features

- Text overlays with formatting
- Keyframe animation with easing
- Project templates (save/load)
- Auto-backups and manual restore
- Real-time collaboration (share links, invites, roles)
- Export presets for platforms
- AI assistant chat (Gemini-powered)

### Account & Admin

- Password change
- Account deletion
- Subscription management (Stripe)
- Tier system (Free, Premium, Admin)
- Activity history
- Keyboard shortcuts
- Theme toggle

## State Management

### Main Stores (Zustand)

- `useEditorStore` - All timeline state
- `useSelectionStore` - Multi-select state
- `useClipboardStore` - Copy/paste state
- `usePlaybackStore` - Playback control
- `useTimelineStore` - Timeline UI state
- `useHistoryStore` - Undo/redo

## Critical User Paths

1. **Sign Up → Create Project → Edit → Export**
2. **Generate Video → Add to Timeline → Export**
3. **Share Project → Collaborator Edits → Backup/Restore**
4. **Upload Asset → Apply Effects → Add Transitions → Export**

## API Endpoints (61 Total)

### By Category

- **Projects:** 5 endpoints
- **Assets:** 9 endpoints
- **Video Gen:** 8 endpoints
- **Audio Gen:** 5 endpoints
- **Export:** 8 endpoints
- **Templates:** 6 endpoints
- **Backups:** 5 endpoints
- **Collaboration:** 13 endpoints
- **Chat:** 4 endpoints
- **Activity:** 2 endpoints
- **Billing:** 3 endpoints
- **Admin:** 3 endpoints
- **System:** 5 endpoints

## Authentication Methods

1. Email/password (Supabase Auth)
2. Anonymous/guest access
3. Password reset flow
4. Session-based (24h web, 8h mobile)

## Rate Limiting

Different tiers for different operations:

- High-rate: Reads, status checks
- Medium-rate: Resource creation
- Low-rate: Uploads, batch operations

## Browser Requirements

- Modern browser with ES2020+ support
- 4GB+ RAM recommended
- WebGL for timeline rendering
- Canvas API for effects

## Database Schema Key Tables

- `projects` - Project metadata
- `assets` - Media files
- `project_collaborators` - Team members
- `project_invites` - Pending invitations
- `share_links` - Public share tokens
- `chat_messages` - AI chat history
- `project_backups` - Project snapshots
- `project_templates` - Saved templates
- `user_profiles` - User tier and settings

## Third-Party Integrations

- **Google Cloud:** Veo, Imagen, Gemini
- **FAL.ai:** Video upscaling, alternative models
- **ElevenLabs:** TTS, sound effects
- **Suno (via Comet API):** Music generation
- **Stripe:** Payments and subscriptions
- **Axiom:** Logging and monitoring
- **PostHog:** Analytics (optional)

## Performance Optimizations

- Clip virtualization (render only visible clips)
- Lazy component loading
- Server-side caching (2-minute TTL)
- History debouncing (per-clip)
- Efficient state snapshots for undo/redo

## Key Shortcuts

- **Space:** Play/pause
- **A:** Select all
- **D:** Deselect
- **X:** Split clip
- **C:** Copy
- **V:** Paste
- **Cmd/Ctrl+Z:** Undo
- **Cmd/Ctrl+Y:** Redo

## Security Features

- Row-Level Security (RLS) at database
- Signed URLs for asset access
- Rate limiting on all endpoints
- CSRF protection
- Strong password requirements
- Session timeouts
- Project ownership verification
- Collaborator role enforcement
