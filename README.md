# Non-Linear Video Editor

A modern, browser-based non-linear video editor built with Next.js 15, React 19, and Supabase.

## Project Status

![Tests](https://img.shields.io/badge/tests-807%2F924%20passing-green)
![Test%20Coverage](https://img.shields.io/badge/coverage-22.67%25-yellow)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Lint](https://img.shields.io/badge/lint-0%20errors-brightgreen)

See [Test Success Report](docs/reports/TEST_SUCCESS_REPORT.md) for detailed testing metrics.

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

All project documentation has been organized into the `/docs/` directory. See the [Documentation Index](docs/README.md) for a complete listing.

### Quick Links

- **[Complete Documentation Index](docs/README.md)** - All documentation organized by category
- **[API Reference](docs/api/API_QUICK_REFERENCE.md)** - Quick API reference guide
- **[Setup Guides](docs/setup/)** - Configuration and setup instructions
- **[Security](docs/security/SECURITY.md)** - Security features and best practices
- **[Architecture](docs/architecture/ARCHITECTURE_STANDARDS.md)** - Architecture standards and patterns
- **[Issue Tracking](docs/issues/ISSUETRACKING.md)** - Current issues and resolutions
- **[Reports](docs/reports/)** - Audit reports, analysis, and evaluations

### Documentation Categories

- **`/docs/api/`** - API documentation for all services and endpoints
- **`/docs/architecture/`** - Architecture standards and React patterns
- **`/docs/security/`** - Security policies, audits, and CORS implementation
- **`/docs/setup/`** - Setup guides for Supabase, Stripe, Vercel, email, and environment variables
- **`/docs/issues/`** - Issue tracking and resolution reports
- **`/docs/reports/`** - Comprehensive reports, audits, and codebase analysis

## Environment Variables

### Required Variables

| Variable                        | Description                         | Get From                                                                      |
| ------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL           | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS-enforced)      | Supabase Dashboard → Project Settings → API                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server-side only) | Supabase Dashboard → Project Settings → API                                   |

### Optional AI Variables

| Variable                 | Description                       | Get From                                                                          |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT` | Google Cloud service account JSON | [Google Cloud Console](https://console.cloud.google.com) → IAM → Service Accounts |
| `GCS_BUCKET_NAME`        | GCS bucket for video processing   | Auto-created if not specified                                                     |
| `GEMINI_API_KEY`         | Google Gemini API key             | [Google AI Studio](https://ai.google.dev)                                         |
| `FAL_API_KEY`            | fal.ai API key for upscaling      | [fal.ai](https://fal.ai)                                                          |
| `COMET_API_KEY`          | Comet API (Suno wrapper)          | [Comet API](https://cometapi.com)                                                 |
| `ELEVENLABS_API_KEY`     | ElevenLabs TTS API key            | [ElevenLabs](https://elevenlabs.io)                                               |
| `WAVESPEED_API_KEY`      | Wavespeed audio API key           | Wavespeed provider                                                                |
| `AXIOM_TOKEN`            | Axiom logging token               | [Axiom](https://axiom.co)                                                         |
| `AXIOM_DATASET`          | Axiom dataset name                | Axiom Dashboard                                                                   |
| `NEXT_PUBLIC_APP_URL`    | Application URL                   | Auto-detected (optional)                                                          |

See [Environment Variables Documentation](docs/setup/ENVIRONMENT_VARIABLES.md) for detailed descriptions.

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
# Build the application
npm run build

# Start production server locally
npm run start
```

The build creates an optimized production bundle with:

- Minified JavaScript and CSS
- Automatic code splitting
- Optimized images
- Tree-shaken dependencies

---

## Deployment

### Vercel (Recommended)

1. **Push to GitHub:**

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Import to Vercel:**

- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repository
- Configure environment variables (see below)
- Deploy

3. **Set Environment Variables:**

In Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Production Variables
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Mark as "Secret"
GOOGLE_SERVICE_ACCOUNT={"type":"..."}   # Mark as "Secret"
GEMINI_API_KEY=xxx                      # Mark as "Secret"
# ... add other optional keys
```

4. **Update Supabase Auth Settings:**

- Go to Supabase Dashboard → Authentication → Settings
- Update Site URL: `https://your-app.vercel.app`
- Add to Redirect URLs: `https://your-app.vercel.app/**`

5. **Deploy:**
   Vercel will automatically deploy on every push to main.

### Other Platforms

**Docker:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Railway, Render, Fly.io:**
Similar to Vercel - set environment variables and deploy from GitHub.

---

## Troubleshooting

### Common Issues

#### 1. "Supabase not configured" Error

**Problem:** Missing or invalid Supabase environment variables.

**Solution:**

```bash
# Verify .env.local contains:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co  # Must start with https://
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...           # Long JWT string
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...               # Long JWT string

# Restart dev server:
npm run dev
```

#### 2. "RLS Policy Violation" / Cannot Create Project

**Problem:** RLS policies not set up correctly.

**Solution:**

1. Run migration: `/supabase/migrations/20251022000000_fix_projects_rls.sql`
2. Verify in Supabase Dashboard → Database → Tables → projects → Policies
3. Should see: `projects_owner_select`, `projects_owner_insert`, `projects_owner_update`, `projects_owner_delete`

#### 3. File Upload Failed

**Problem:** Storage bucket or policies missing.

**Solution:**

1. Run initial migration: `/supabase/migrations/20250101000000_init_schema.sql`
2. Verify buckets exist: Supabase Dashboard → Storage
3. Check policies: Storage → Policies → assets bucket

#### 4. Video Generation Not Working

**Problem:** Missing Google Cloud credentials.

**Solution:**

```bash
# Set GOOGLE_SERVICE_ACCOUNT in .env.local
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}

# Enable required APIs in Google Cloud Console:
# - Vertex AI API
# - Video Intelligence API (for scene detection)
# - Cloud Storage API
```

#### 5. Scene Detection Fails

**Problem:** GCS bucket doesn't exist or no permissions.

**Solution:**

1. Set `GCS_BUCKET_NAME` environment variable (optional)
2. Or let it auto-create: `{project-id}-video-processing`
3. Grant service account Storage Admin role in Google Cloud

#### 6. AI Chat Not Working

**Problem:** Missing Gemini API key.

**Solution:**

```bash
# Get API key from https://ai.google.dev
GEMINI_API_KEY=your-api-key

# Verify key is valid:
curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_API_KEY"
```

#### 7. Build Fails

**Problem:** TypeScript errors or missing dependencies.

**Solution:**

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install

# Run type check
npm run build
```

#### 8. "Invalid JWT" Error

**Problem:** Incorrect Supabase keys.

**Solution:**

- Re-copy keys from Supabase Dashboard
- Ensure no extra spaces or newlines
- Verify using correct project keys
- Restart dev server

#### 9. Email Not Sending

**Problem:** Default SMTP limits hit.

**Solution for Production:**

1. Configure custom SMTP (Resend recommended):
   - Get API key from [resend.com](https://resend.com)
   - Supabase Dashboard → Project Settings → Auth → SMTP Settings
   - Configure Resend SMTP:
     ```
     Host: smtp.resend.com
     Port: 587
     Username: resend
     Password: your-api-key
     ```

**Solution for Development:**

- Check Supabase Dashboard → Authentication → Logs
- Temporarily disable email confirmation:
  - Auth → Settings → Disable "Enable email confirmations"

#### 10. Slow Timeline Performance

**Problem:** Too many clips on timeline.

**Solution:**

- Limit to ~100-200 clips per project
- Close other browser tabs
- Increase browser memory limit
- Consider breaking into multiple projects
- See [Performance Guide](docs/PERFORMANCE.md) for optimization tips

### Debug Mode

Enable verbose logging:

```typescript
// In browser console
localStorage.setItem('debug', '*');

// Disable
localStorage.removeItem('debug');
```

### Getting Help

1. **Check Logs:**
   - Browser DevTools Console
   - Supabase Dashboard → Logs
   - Vercel Dashboard → Logs (if deployed)
   - Axiom Dashboard (if configured)

2. **Documentation:**
   - [Supabase Docs](https://supabase.com/docs)
   - [Next.js Docs](https://nextjs.org/docs)
   - [Project Documentation](docs/)

3. **Common Solutions:**
   - Clear browser cache
   - Restart dev server
   - Check environment variables
   - Verify Supabase migrations ran
   - Test with incognito window

---

## Development Workflow

### Daily Development

```bash
# Start dev server
npm run dev

# Make changes to code

# Build to verify (recommended before commits)
npm run build

# Commit changes
git add .
git commit -m "Your message"
git push
```

### Before Each Release

1. Run build: `npm run build`
2. Test critical features (see [Testing Guide](docs/TESTING.md))
3. Check for console errors
4. Verify environment variables
5. Review security checklist
6. Deploy to staging (preview)
7. Deploy to production

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use functional components with hooks
- Write self-documenting code
- Add comments for complex logic
- Test before committing
- Keep PRs focused and small

---

## License

MIT License - see LICENSE file for details.

---

## Acknowledgments

- Built with [Next.js 15](https://nextjs.org)
- Powered by [Supabase](https://supabase.com)
- AI features by [Google Gemini](https://ai.google.dev) and [Google Veo](https://deepmind.google/technologies/veo/)
- State management by [Zustand](https://github.com/pmndrs/zustand)
- Logging by [Axiom](https://axiom.co)

---

Built with ❤️ using [Claude Code](https://claude.com/claude-code)
