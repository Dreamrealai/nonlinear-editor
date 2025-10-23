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

- **Node.js 20+** and npm
- **Supabase account** ([sign up free](https://supabase.com))
- (Optional) **Google Cloud account** for AI features (Veo, Imagen, scene detection)
- (Optional) **Gemini API key** for AI chat
- (Optional) **Axiom account** for logging

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Dreamrealai/nonlinear-editor.git
cd nonlinear-editor
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up Supabase:**

Follow the detailed [Supabase Setup Guide](docs/SUPABASE_SETUP.md) to:
- Create Supabase project
- Run database migrations
- Configure storage buckets
- Set up authentication
- Get API keys

**Quick Supabase Setup:**
```bash
# 1. Create project at https://supabase.com/dashboard
# 2. Get your project URL and keys
# 3. Run migrations in SQL Editor (see SUPABASE_SETUP.md)
# 4. Copy API keys to .env.local
```

4. **Configure environment variables:**

Copy the example file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# ============================================
# REQUIRED - Supabase
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ============================================
# OPTIONAL - AI Features
# ============================================

# Google AI Services (Veo video generation, Imagen image generation, scene detection)
# Get from: https://console.cloud.google.com
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
GCS_BUCKET_NAME=your-video-processing-bucket  # Auto-created if not specified

# Gemini AI Chat (Get from: https://ai.google.dev)
GEMINI_API_KEY=your-gemini-api-key

# fal.ai (Video upscaling, audio generation)
# Get from: https://fal.ai
FAL_API_KEY=your-fal-api-key

# ============================================
# OPTIONAL - Audio Generation
# ============================================

# Suno Music Generation (via Comet API)
# Get from: https://cometapi.com
COMET_API_KEY=your-comet-api-key

# ElevenLabs Text-to-Speech & Sound Effects
# Get from: https://elevenlabs.io
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Wavespeed Audio Processing
WAVESPEED_API_KEY=your-wavespeed-api-key

# ============================================
# OPTIONAL - Logging & Monitoring
# ============================================

# Axiom (Get from: https://axiom.co)
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=your-dataset-name

# ============================================
# OPTIONAL - Application Settings
# ============================================

# For CORS and redirects (auto-detected in most cases)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See [Environment Variables](#environment-variables) section below for detailed descriptions.

5. **Run the development server:**
```bash
npm run dev
```

6. **Open the app:**
Navigate to [http://localhost:3000](http://localhost:3000)

7. **Create an account:**
- Go to `/signup`
- Enter email and password
- Confirm email (if enabled)
- Start editing!

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
