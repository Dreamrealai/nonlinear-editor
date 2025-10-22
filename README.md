# Non-Linear Video Editor

A modern, browser-based non-linear video editor built with Next.js 15, React 19, and Supabase.

## Features

✅ **Multi-Track Timeline**
- Unlimited video, audio, and image tracks
- Drag-and-drop clip positioning
- Visual timeline with zoom controls
- Snap-to-grid functionality

✅ **Advanced Editing**
- Clip trimming with precision handles
- Transitions (crossfade, fade-in, fade-out)
- Per-clip opacity and volume control
- Playback speed adjustment (0.25x - 4x)
- Crop rectangles
- Split clips at playhead

✅ **Playback Engine**
- Multi-track video synchronization
- RAF-based smooth playback
- Buffering management
- Timecode display

✅ **State Management**
- Undo/redo (50-action history)
- Autosave (2-second debounce)
- Copy/paste clips
- Multi-select support

✅ **Asset Management**
- Upload video, audio, and images
- Automatic thumbnail generation
- Secure signed URLs
- Scene detection

✅ **AI Assistant**
- Powered by Google Gemini
- Context-aware help
- Project-specific chat history

✅ **Authentication & Security**
- Supabase Auth integration
- Row-level security (RLS)
- Email/password + anonymous sign-in
- Password reset flow
- CSRF protection
- Strong password requirements
- Session timeouts (24h/8h)

✅ **Logging & Monitoring**
- Browser error tracking
- Axiom integration
- Structured logging
- Error boundaries

⚠️ **Export (Placeholder)**
- Export API endpoint ready
- Requires FFmpeg server integration
- Multiple quality presets
- Format support (MP4, WebM)

## Tech Stack

- **Framework:** Next.js 15.5.6 (App Router)
- **UI:** React 19.1.0
- **Styling:** Tailwind CSS 4.0
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **State:** Zustand + Immer
- **AI:** Google Gemini
- **Logging:** Custom + Axiom

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account
- (Optional) Axiom account for logging
- (Optional) Gemini API key for AI features

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Dreamrealai/nonlinear-editor.git
cd nonlinear-editor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:
```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Features (Optional)
GEMINI_API_KEY=your-gemini-api-key

# Logging (Optional)
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=your-dataset-name
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Documentation

- [API Documentation](docs/API.md) - Complete API reference
- [Database Schema](docs/API.md#database-schema) - Database structure
- [Environment Variables](docs/API.md#environment-variables) - Configuration guide

## Quick Start

After installation:

1. Sign up for an account at `http://localhost:3000/signup`
2. Create a new project
3. Upload video, audio, or image assets
4. Drag assets onto the timeline
5. Edit clips, add transitions
6. Use the AI assistant for help

## Build for Production

```bash
npm run build
npm run start
```

## License

MIT License

---

Built with ❤️ using [Claude Code](https://claude.com/claude-code)
