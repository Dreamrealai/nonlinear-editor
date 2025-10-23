# Non-Linear Video Editor - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [External Services Integration](#external-services-integration)
7. [State Management](#state-management)
8. [Data Flow](#data-flow)
9. [Security Architecture](#security-architecture)
10. [Technology Stack](#technology-stack)

---

## System Overview

The Non-Linear Video Editor is a modern, production-ready web-based video editing application built with Next.js 15, React 19, and TypeScript. It provides comprehensive AI-powered video editing capabilities with integration to multiple AI services, subscription management via Stripe, and enterprise-grade logging and monitoring.

### Key Features
- **Multi-track Timeline Editing**: Drag-drop support, trim handles, snap-to-grid, text overlays
- **AI-Powered Video Generation**: Google Veo 3.1, FAL.ai (MiniMax, SeeDance)
- **AI Image Generation**: Google Imagen 3
- **AI Chat Assistant**: Gemini 2.5 Flash with context-aware assistance
- **Scene Detection**: Google Video Intelligence API for automatic scene splitting
- **Audio Generation**: Suno (music), ElevenLabs (TTS & sound effects)
- **Video Upscaling**: FAL.ai Topaz upscaling
- **Audio Extraction**: Video-to-audio conversion
- **Keyframe Editing**: Extract and edit individual frames
- **Undo/Redo**: 50-action history with Immer structural sharing
- **Real-time Preview**: RAF-based multi-track synchronized playback
- **Subscription Management**: Stripe integration with tier-based limits
- **Activity History**: User audit log for GDPR compliance
- **Admin Features**: User management, tier changes, audit logging
- **Security**: Row-Level Security (RLS), signed URLs, rate limiting
- **Observability**: Comprehensive logging with Axiom integration

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        UI[React UI Components]
        Timeline[Timeline Editor]
        Preview[Video Preview]
        Chat[AI Chat Interface]
    end

    subgraph "Application Layer - Next.js 15"
        AppRouter[App Router]
        Middleware[Auth Middleware]
        SSR[Server Components]
        API[API Routes - 30+ endpoints]
    end

    subgraph "State Management"
        Zustand[Zustand Store]
        History[Undo/Redo Stack]
        LocalCache[Client Cache]
    end

    subgraph "Backend Services"
        SupabaseAuth[Supabase Auth]
        SupabaseDB[PostgreSQL Database]
        SupabaseStorage[File Storage]
    end

    subgraph "External AI Services"
        Gemini[Google Gemini 2.5 Flash]
        Veo[Google Veo 3.1]
        VideoIntel[Video Intelligence API]
        Suno[Suno Audio]
        ElevenLabs[ElevenLabs TTS]
    end

    subgraph "Observability"
        Axiom[Axiom Logging]
    end

    Browser --> UI
    UI --> Timeline
    UI --> Preview
    UI --> Chat
    UI --> Zustand
    Timeline --> Zustand
    Preview --> Zustand

    Browser --> AppRouter
    AppRouter --> Middleware
    Middleware --> SSR
    Middleware --> API

    API --> SupabaseAuth
    API --> SupabaseDB
    API --> SupabaseStorage
    API --> Gemini
    API --> Veo
    API --> VideoIntel
    API --> Suno
    API --> ElevenLabs
    API --> Axiom

    Zustand --> API
    Zustand --> History
    Zustand --> LocalCache

    SSR --> SupabaseDB
    SSR --> SupabaseAuth
```

---

## Frontend Architecture

### Component Hierarchy

```mermaid
graph TD
    subgraph "App Router Structure"
        RootLayout[app/layout.tsx]
        HomePage[app/page.tsx]
        EditorPage[app/editor/page.tsx]
        ProjectsPage[app/projects/page.tsx]
    end

    subgraph "Core Editor Components"
        EditorClient[BrowserEditorClient]
        EditorHeader[EditorHeader]
        HorizontalTimeline[HorizontalTimeline]
        PreviewPlayer[PreviewPlayer]
        KeyframeEditor[KeyframeEditorShell]
        ChatInterface[ChatInterface]
    end

    subgraph "UI Components"
        Button[Button]
        Input[Input]
        ProjectCard[ProjectCard]
        SceneCard[SceneCard]
        Dropdown[Dropdown]
        Modal[Modal]
        Toast[Toast]
    end

    subgraph "Timeline Components"
        TimelineTrack[TimelineTrack]
        TimelineClip[Clip Component]
        Playhead[Playhead]
        Scrubber[Scrubber]
        TrimHandles[Trim Handles]
    end

    RootLayout --> HomePage
    RootLayout --> EditorPage
    RootLayout --> ProjectsPage

    EditorPage --> EditorClient
    EditorClient --> EditorHeader
    EditorClient --> HorizontalTimeline
    EditorClient --> PreviewPlayer
    EditorClient --> KeyframeEditor
    EditorClient --> ChatInterface

    EditorHeader --> Button
    EditorHeader --> Dropdown

    HorizontalTimeline --> TimelineTrack
    TimelineTrack --> TimelineClip
    HorizontalTimeline --> Playhead
    HorizontalTimeline --> Scrubber
    TimelineClip --> TrimHandles

    KeyframeEditor --> SceneCard
    KeyframeEditor --> Modal

    ChatInterface --> Input
    ChatInterface --> Button
```

### Key Frontend Files
- **components/BrowserEditorClient.tsx** - Main editor orchestrator, handles timeline state
- **components/HorizontalTimeline.tsx** - Timeline UI with drag-drop, trimming, scrubbing
- **components/PreviewPlayer.tsx** - Multi-track video playback with RAF-based sync
- **components/KeyframeEditorShell.tsx** - Keyframe extraction and AI-powered editing
- **components/EditorHeader.tsx** - Navigation, project switcher
- **components/ChatInterface.tsx** - AI chat with Gemini integration

---

## Backend Architecture

### API Routes (30+ Total)

```mermaid
graph TB
    subgraph "Video Processing (7 routes)"
        GenVideo[POST /api/video/generate]
        VideoStatus[GET /api/video/status]
        Upscale[POST /api/video/upscale]
        UpscaleStatus[GET /api/video/upscale-status]
        SplitScenes[POST /api/video/split-scenes]
        SplitAudio[POST /api/video/split-audio]
        GenAudio[POST /api/video/generate-audio]
        GenAudioStatus[GET /api/video/generate-audio-status]
    end

    subgraph "AI Features (2 routes)"
        Chat[POST /api/ai/chat]
        EditFrame[POST /api/frames/:frameId/edit]
    end

    subgraph "Audio Generation (5 routes)"
        SunoGen[POST /api/audio/suno/generate]
        SunoStatus[GET /api/audio/suno/status]
        ElevenGen[POST /api/audio/elevenlabs/generate]
        ElevenVoices[GET /api/audio/elevenlabs/voices]
        ElevenSFX[POST /api/audio/elevenlabs/sfx]
    end

    subgraph "Image Generation (1 route)"
        ImagenGen[POST /api/image/generate]
    end

    subgraph "Project Management (2 routes)"
        ListProjects[GET /api/projects]
        CreateProject[POST /api/projects]
    end

    subgraph "Asset Management (3 routes)"
        UploadAsset[POST /api/assets/upload]
        SignURL[GET /api/assets/sign]
        ListAssets[GET /api/assets]
    end

    subgraph "Subscription (3 routes)"
        Checkout[POST /api/stripe/checkout]
        Portal[GET /api/stripe/portal]
        Webhook[POST /api/stripe/webhook]
    end

    subgraph "User Management (3 routes)"
        DeleteAccount[POST /api/user/delete-account]
        GetHistory[GET /api/history]
        ClearHistory[DELETE /api/history]
    end

    subgraph "Admin (2 routes)"
        ChangeTier[POST /api/admin/change-tier]
        DeleteUser[POST /api/admin/delete-user]
    end

    subgraph "Utility (2 routes)"
        Logger[POST /api/logs]
        Export[POST /api/export]
    end
```

### API Route Responsibilities

#### Video Generation
- **POST /api/video/generate** - Generate video using Google Veo 3.1
- **GET /api/video/status** - Check video generation status
- **POST /api/video/split-scenes** - Detect scenes using Video Intelligence
- **POST /api/video/split-audio** - Extract and analyze audio tracks

#### AI Features
- **POST /api/chat** - Chat with Gemini 2.5 Flash for editing assistance
- **POST /api/edit-frame** - AI-powered frame editing (mask-based editing)

#### Audio Generation
- **POST /api/audio/suno** - Generate music with Suno
- **POST /api/audio/elevenlabs** - Generate voiceover with ElevenLabs TTS

#### Project & Asset Management
- **POST /api/projects/create** - Create new editing project
- **GET /api/projects** - List user's projects
- **PUT /api/projects/:id** - Update project metadata
- **POST /api/assets/upload** - Upload video/audio/image assets
- **POST /api/assets/sign-url** - Generate signed URLs for secure access
- **GET /api/assets** - List project assets

#### Utility
- **POST /api/log** - Client-side logging to Axiom
- **GET /api/health** - Health check endpoint

---

## Logging & Monitoring Architecture

### Comprehensive Logging System

```mermaid
graph TB
    subgraph "Client-Side Logging"
        BrowserCode[Browser Application]
        BrowserLogger[BrowserLogger Class]
        LogBatch[Log Batch Queue]
    end

    subgraph "Server-Side Logging"
        APIRoutes[API Routes]
        ServerLogger[ServerLogger - Pino]
        AxiomTransport[Axiom Transport]
    end

    subgraph "Log Aggregation"
        LogsAPI[POST /api/logs]
        AxiomAPI[Axiom.co API]
    end

    subgraph "Monitoring Dashboard"
        AxiomDashboard[Axiom Dashboard]
        Queries[APL Queries]
        Alerts[Alert Rules]
    end

    BrowserCode --> BrowserLogger
    BrowserLogger --> LogBatch
    LogBatch -->|Batch POST every 10s| LogsAPI
    LogsAPI --> AxiomAPI

    APIRoutes --> ServerLogger
    ServerLogger --> AxiomTransport
    AxiomTransport -->|Real-time| AxiomAPI

    AxiomAPI --> AxiomDashboard
    AxiomDashboard --> Queries
    AxiomDashboard --> Alerts
```

### Log Event Naming Convention

All logs follow a structured event naming pattern:
- `{domain}.{feature}.{event_type}`
- Examples:
  - `video.generate.request_started`
  - `video.upscale.success`
  - `audio.tts.api_error`
  - `assets.sign.storage_error`
  - `video.scene_detection.error`

### Log Levels & Usage

| Level | Usage | Examples |
|-------|-------|----------|
| `error` | Failures, exceptions, critical issues | API errors, DB failures, external service errors |
| `warn` | Non-critical issues, deprecations | Rate limit warnings, missing optional config |
| `info` | Normal operations, important events | Request started, operation completed |
| `debug` | Detailed information for debugging | Rate limit remaining, intermediate states |

### Logging Best Practices (Implemented)

1. **Structured Context**: All logs include context objects
   ```typescript
   serverLogger.error({
     error,
     assetId,
     projectId,
     event: 'video.upscale.error'
   }, 'Error in video upscale');
   ```

2. **Consistent Event Names**: Domain-based hierarchical naming
3. **No Sensitive Data**: Passwords, API keys, PII excluded
4. **Performance Tracking**: Duration logged for expensive operations
5. **Error Tracking**: Stack traces included for debugging

---

## Subscription & Payment Architecture

### Stripe Integration Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant API
    participant Stripe
    participant DB
    participant Webhook

    User->>UI: Click "Upgrade"
    UI->>API: POST /api/stripe/checkout
    API->>Stripe: Create checkout session
    Stripe-->>API: Session URL
    API-->>UI: Redirect URL
    UI->>Stripe: Redirect to checkout
    User->>Stripe: Complete payment
    Stripe->>Webhook: POST /api/stripe/webhook
    Webhook->>DB: Update user_subscriptions
    Webhook-->>Stripe: 200 OK
    Stripe->>User: Redirect to success page
    UI->>UI: Refresh subscription status
```

### Subscription Tiers

| Tier | Features | Limits |
|------|----------|--------|
| Free | Basic editing, 5 projects | 100 MB storage |
| Pro | AI features, unlimited projects | 10 GB storage |
| Enterprise | Priority support, custom branding | Unlimited storage |

### Subscription Database Schema

```mermaid
erDiagram
    USERS ||--o| USER_SUBSCRIPTIONS : has
    USER_SUBSCRIPTIONS {
        uuid user_id PK
        string tier
        string stripe_customer_id
        string stripe_subscription_id
        timestamp current_period_start
        timestamp current_period_end
        string status
        timestamp created_at
        timestamp updated_at
    }
```

---

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    USERS ||--o{ ASSETS : owns
    USERS ||--o{ SCENES : owns
    USERS ||--o| USER_SUBSCRIPTIONS : has
    USERS ||--o{ USER_ACTIVITY_HISTORY : generates
    PROJECTS ||--o{ CLIPS : contains
    PROJECTS ||--o{ ASSETS : uses
    PROJECTS ||--o{ TEXT_OVERLAYS : has
    SCENES ||--o{ SCENE_FRAMES : contains
    SCENE_FRAMES ||--o{ FRAME_EDITS : has
    ASSETS ||--o{ CLIPS : used_in
    PROJECTS {
        uuid id PK
        uuid user_id FK
        string name
        string description
        timestamp created_at
        timestamp updated_at
    }

    CLIPS {
        uuid id PK
        uuid project_id FK
        uuid asset_id FK
        int track_index
        float start_time
        float end_time
        float trim_start
        float trim_end
        jsonb properties
        timestamp created_at
    }

    TEXT_OVERLAYS {
        uuid id PK
        uuid project_id FK
        string text
        float start_time
        float duration
        jsonb style
        timestamp created_at
    }

    ASSETS {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        string type
        string source
        string storage_url
        string mime_type
        jsonb metadata
        timestamp created_at
    }

    SCENES {
        uuid id PK
        uuid project_id FK
        uuid asset_id FK
        int start_ms
        int end_ms
        timestamp created_at
    }

    SCENE_FRAMES {
        uuid id PK
        uuid project_id FK
        uuid asset_id FK
        int frame_number
        string storage_url
        jsonb metadata
        timestamp created_at
    }

    PROCESSING_JOBS {
        uuid id PK
        uuid user_id FK
        string job_type
        string status
        jsonb input_data
        jsonb output_data
        timestamp created_at
        timestamp updated_at
    }

    USER_SUBSCRIPTIONS {
        uuid user_id PK
        string tier
        string stripe_customer_id
        string stripe_subscription_id
        timestamp current_period_start
        timestamp current_period_end
        string status
        timestamp created_at
        timestamp updated_at
    }

    USER_ACTIVITY_HISTORY {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        string activity_type
        string title
        string model
        uuid asset_id FK
        jsonb metadata
        timestamp created_at
    }

    RATE_LIMITS {
        string key PK
        int count
        timestamp window_start
        timestamp created_at
        timestamp updated_at
    }

    ADMIN_AUDIT_LOG {
        uuid id PK
        uuid admin_user_id FK
        uuid target_user_id FK
        string action
        jsonb details
        timestamp created_at
    }

    USERS {
        uuid id PK
        string email
        timestamp created_at
    }
```

### Database Tables

1. **projects** - User editing projects
2. **clips** - Timeline clips with trim/transform data
3. **text_overlays** - Text overlays on timeline
4. **assets** - Uploaded media files (video, audio, images)
5. **scenes** - Detected scenes from videos (Google Video Intelligence)
6. **scene_frames** - Individual frames extracted from scenes
7. **processing_jobs** - Background job tracking (video gen, upscale, etc.)
8. **user_subscriptions** - Stripe subscription tier tracking
9. **user_activity_history** - Audit log for user actions (GDPR compliance)
10. **rate_limits** - Rate limiting tracking per user/endpoint
11. **admin_audit_log** - Admin action tracking
12. **users** - Authenticated users (managed by Supabase Auth)

### Row-Level Security (RLS)
All tables implement RLS policies:
- Users can only access their own data
- Policies enforce `user_id = auth.uid()`
- Service role bypasses RLS for server operations

---

## External Services Integration

### Google AI Services

```mermaid
graph TB
    subgraph "Google Cloud Platform"
        Gemini[Gemini 2.5 Flash]
        Veo[Veo 3.1 Video Generation]
        VideoIntel[Video Intelligence API]
        Imagen[Imagen 3 - Image Generation]
    end

    subgraph "API Integration Layer"
        GeminiClient[lib/gemini.ts]
        VeoClient[lib/veo.ts]
        VideoIntelClient[lib/video-intelligence.ts]
    end

    subgraph "API Routes"
        ChatAPI[/api/chat]
        VideoGenAPI[/api/video/generate]
        VideoStatusAPI[/api/video/status]
        SplitScenesAPI[/api/video/split-scenes]
        EditFrameAPI[/api/edit-frame]
    end

    ChatAPI --> GeminiClient
    VideoGenAPI --> VeoClient
    VideoStatusAPI --> VeoClient
    SplitScenesAPI --> VideoIntelClient
    EditFrameAPI --> GeminiClient

    GeminiClient --> Gemini
    VeoClient --> Veo
    VideoIntelClient --> VideoIntel
```

### Audio Services

```mermaid
graph TB
    subgraph "Audio Providers"
        Suno[Suno - Music Generation]
        ElevenLabs[ElevenLabs - Text-to-Speech]
    end

    subgraph "API Integration"
        SunoAPI[/api/audio/suno]
        ElevenAPI[/api/audio/elevenlabs]
    end

    subgraph "Client Libraries"
        HTTPClient[fetch/axios]
    end

    SunoAPI --> HTTPClient
    ElevenAPI --> HTTPClient
    HTTPClient --> Suno
    HTTPClient --> ElevenLabs
```

### Service Configuration

| Service | Purpose | Authentication | Limits |
|---------|---------|----------------|--------|
| Google Gemini 2.5 Flash | Chat, analysis, image editing | API Key | Rate limited |
| Google Veo 3.1 | Video generation | Service Account | Quota-based |
| Video Intelligence | Scene detection | Service Account | Quota-based |
| Suno | Music generation | API Key | Credit-based |
| ElevenLabs | Text-to-speech | API Key | Character-based |
| Supabase | Database, auth, storage | Service key | Connection pool |
| Axiom | Logging & monitoring | API Token | Event-based |

---

## State Management

### Zustand Store Architecture

```mermaid
graph TB
    subgraph "Zustand Store - state/editorStore.ts"
        State[Editor State]
        Actions[50+ Actions]
        Middleware[Immer Middleware]
        History[Undo/Redo History]
    end

    subgraph "State Shape"
        Timeline[timeline: TimelineState]
        Clips[clips: Map<id, Clip>]
        Tracks[tracks: Track[]]
        Playback[playbackState]
        Selection[selectedClips]
        UI[uiState]
    end

    subgraph "Key Actions"
        AddClip[addClip]
        MoveClip[moveClip]
        TrimClip[trimClip]
        DeleteClip[deleteClip]
        UndoRedo[undo/redo]
        SaveTimeline[saveToSupabase]
    end

    subgraph "Persistence"
        LocalStorage[LocalStorage Cache]
        Supabase[Supabase Database]
        Debounce[2s Debounce]
    end

    State --> Timeline
    State --> Clips
    State --> Tracks
    State --> Playback
    State --> Selection
    State --> UI

    Actions --> AddClip
    Actions --> MoveClip
    Actions --> TrimClip
    Actions --> DeleteClip
    Actions --> UndoRedo
    Actions --> SaveTimeline

    Middleware --> History
    History --> UndoRedo

    SaveTimeline --> Debounce
    Debounce --> Supabase
    State --> LocalStorage
```

### State Synchronization

1. **User Interaction** → Update Zustand store
2. **Middleware** → Clone state to history stack (max 50)
3. **Debounce** → Wait 2 seconds for more changes
4. **Persist** → Upsert to Supabase `timelines` table
5. **Cache** → Update localStorage for offline access

### Undo/Redo Implementation
- **Stack Size**: 50 states
- **Storage**: Cloned timeline objects
- **Efficiency**: Structural sharing via Immer
- **Scope**: Timeline-level (not granular)

---

## Data Flow

### Video Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant API
    participant Veo
    participant DB
    participant Storage

    User->>UI: Request video generation
    UI->>API: POST /api/video/generate {prompt}
    API->>Veo: Create video generation job
    Veo-->>API: Job ID
    API->>DB: Store job metadata
    API-->>UI: Return job ID

    loop Poll Status
        UI->>API: GET /api/video/status?id=xxx
        API->>Veo: Check job status
        Veo-->>API: Status update
        API-->>UI: Return status
    end

    Veo->>Veo: Complete generation
    UI->>API: GET /api/video/status?id=xxx
    API->>Veo: Fetch video URL
    Veo-->>API: Video URL
    API->>Storage: Download & upload to Supabase
    Storage-->>API: Storage path
    API->>DB: Create asset record
    API-->>UI: Video ready + asset ID
    UI->>UI: Add to timeline
```

### Timeline Editing Flow

```mermaid
sequenceDiagram
    participant User
    participant Timeline
    participant Store
    participant Middleware
    participant API
    participant DB

    User->>Timeline: Drag clip
    Timeline->>Store: dispatch(moveClip)
    Store->>Middleware: Update state via Immer
    Middleware->>Store: Clone to history
    Store-->>Timeline: Re-render

    Note over Store: 2-second debounce

    Store->>API: POST /api/projects/:id/timeline
    API->>DB: UPSERT timeline_data
    DB-->>API: Success
    API-->>Store: Saved
```

### Chat Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Chat
    participant API
    participant Gemini
    participant Store

    User->>Chat: Type message
    Chat->>API: POST /api/chat {message, context}
    API->>Gemini: Send prompt with timeline context
    Gemini-->>API: AI response
    API-->>Chat: Display response

    alt Action Suggested
        Chat->>Store: Execute timeline action
        Store->>Store: Update timeline
        Store-->>Chat: Confirm change
    end
```

### Asset Upload Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant API
    participant Storage
    participant DB

    User->>UI: Select file
    UI->>API: POST /api/assets/upload
    API->>Storage: Upload to Supabase Storage
    Storage-->>API: Storage path
    API->>DB: Create asset record
    DB-->>API: Asset ID
    API-->>UI: Asset metadata + signed URL
    UI->>Store: Add asset to library
```

---

## Security Architecture

### Authentication Flow

```mermaid
graph TB
    subgraph "Client"
        Browser[Browser]
        Cookies[HTTP-only Cookies]
    end

    subgraph "Next.js Middleware"
        AuthCheck[middleware.ts]
        Protected[Protected Routes]
    end

    subgraph "Supabase Auth"
        Session[Session Management]
        JWT[JWT Tokens]
        Users[User Database]
    end

    Browser --> Cookies
    Cookies --> AuthCheck
    AuthCheck --> Protected
    Protected --> Session
    Session --> JWT
    JWT --> Users
```

### Security Layers

#### 1. Authentication
- **Provider**: Supabase Auth
- **Method**: Email/password, OAuth
- **Session**: HTTP-only cookies
- **Middleware**: Route protection at `/editor`, `/projects`

#### 2. Authorization
- **Database**: Row-Level Security (RLS)
- **Storage**: Bucket policies
- **API**: User ID validation in routes

#### 3. Data Protection
- **Signed URLs**: Time-limited asset access (1 hour)
- **HTTPS**: All communications encrypted
- **Secrets**: Environment variables only
- **CSRF**: Next.js built-in protection

#### 4. API Security
- **Rate Limiting**: Per-user quotas
- **Input Validation**: Zod schemas
- **Error Handling**: No sensitive data in errors
- **Logging**: Axiom for audit trails

### Supabase Client Types

```typescript
// 1. Browser client - RLS enforced
const supabase = createBrowserClient()

// 2. Server client - RLS enforced
const supabase = createServerClient()

// 3. Service role - Bypasses RLS (admin)
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY)
```

### RLS Policy Examples

```sql
-- Projects table
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router)
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5.7.3
- **Styling**: Tailwind CSS 4.0.0
- **State**: Zustand 5.0.4 + Immer 10.1.1
- **Build Tool**: Turbopack (Next.js bundled)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage (S3-compatible)
- **Auth**: Supabase Auth
- **ORM**: Supabase JS Client

### External Services
- **AI**: Google Gemini 2.5 Flash, Veo 3.1, Video Intelligence
- **Audio**: Suno, ElevenLabs
- **Logging**: Axiom
- **Hosting**: Vercel (assumed)

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **Formatting**: Prettier (via ESLint)
- **Type Checking**: TypeScript strict mode

### Browser APIs Used
- **Media**: HTMLVideoElement, Web Audio API
- **Graphics**: Canvas API (for frame extraction)
- **Storage**: LocalStorage (caching)
- **Drag & Drop**: HTML5 DnD API
- **Animation**: requestAnimationFrame

---

## Performance Considerations

### Optimizations
1. **Build**: Turbopack for fast development builds
2. **Rendering**: React 19 concurrent features
3. **State**: Immer structural sharing reduces memory
4. **Debouncing**: 2-second autosave prevents DB spam
5. **Caching**: LocalStorage for offline editing
6. **Asset Loading**: Signed URLs with CDN delivery
7. **Code Splitting**: Dynamic imports for heavy components

### Scalability Limits
- **Undo Stack**: 50 states (~5-10 MB typical)
- **Timeline Clips**: Performance degrades >200 clips
- **Video Processing**: Client-side limited by browser memory
- **Concurrent Users**: Supabase connection pool (default 15)

### Future Improvements
- Server-side video processing (FFmpeg)
- WebSocket for real-time collaboration
- Service worker for offline mode
- WebCodecs API for faster video processing
- IndexedDB for large project caching

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Vercel Edge Network"
        Edge[Edge Functions]
        CDN[Static Assets CDN]
        SSR[Server-Side Rendering]
    end

    subgraph "Supabase Cloud"
        DB[(PostgreSQL)]
        Storage[Storage Buckets]
        Auth[Auth Service]
    end

    subgraph "External APIs"
        Google[Google AI APIs]
        Audio[Audio Services]
    end

    subgraph "Monitoring"
        Axiom[Axiom Logs]
        Vercel[Vercel Analytics]
    end

    Edge --> SSR
    Edge --> CDN
    SSR --> DB
    SSR --> Storage
    SSR --> Auth
    SSR --> Google
    SSR --> Audio
    SSR --> Axiom
    CDN --> Axiom
```

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_AI_API_KEY`
- `SUNO_API_KEY`
- `ELEVENLABS_API_KEY`
- `AXIOM_TOKEN`

---

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Run dev server (Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Git Workflow (from CLAUDE.md)
1. Make code changes
2. Run `npm run build` to verify
3. `git add .`
4. `git commit -m "descriptive message"`
5. `git push`

### Database Migrations
```bash
# Create migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

---

## Appendix: File Structure

```
non-linear-editor/
├── app/                    # Next.js App Router
│   ├── api/               # 15 API route handlers
│   ├── editor/            # Editor page
│   ├── projects/          # Projects page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # 8 React components
│   ├── BrowserEditorClient.tsx
│   ├── HorizontalTimeline.tsx
│   ├── PreviewPlayer.tsx
│   ├── KeyframeEditorShell.tsx
│   └── ...
├── lib/                   # Service integrations
│   ├── supabase/         # 3 Supabase clients
│   ├── gemini.ts         # Gemini API
│   ├── veo.ts            # Veo API
│   └── logger.ts         # Axiom logging
├── state/                 # Zustand store
│   └── editorStore.ts    # 50+ actions
├── types/                 # TypeScript definitions
│   ├── timeline.ts
│   ├── clip.ts
│   └── track.ts
├── supabase/             # Database
│   └── migrations/       # SQL migrations
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md   # This file
│   └── api/              # API docs
├── public/               # Static assets
├── middleware.ts         # Auth middleware
└── package.json          # Dependencies
```

---

## Glossary

- **Clip**: A segment of media on the timeline (video/audio/image)
- **Track**: A horizontal layer on the timeline (video track, audio track)
- **Keyframe**: A specific frame extracted from a video for editing
- **Scene**: A continuous segment of video detected by AI
- **Timeline**: The editing workspace with tracks and clips
- **Asset**: An uploaded media file (video, audio, image)
- **Signed URL**: Time-limited URL for secure file access
- **RLS**: Row-Level Security (database-level authorization)
- **RAF**: requestAnimationFrame (browser API for smooth playback)

---

## Complete Request Lifecycle

### End-to-End Request Flow with Logging

```mermaid
sequenceDiagram
    autonumber
    participant Browser
    participant Middleware
    participant APIRoute
    participant Logger
    participant RateLimit
    participant Auth
    participant Database
    participant External
    participant Axiom

    Browser->>Middleware: HTTPS Request
    Middleware->>Auth: Verify session cookie
    Auth-->>Middleware: User authenticated
    Middleware->>APIRoute: Forward request

    APIRoute->>Logger: serverLogger.info('request_started')
    Logger->>Axiom: Batch log event

    APIRoute->>RateLimit: Check rate limit
    RateLimit->>Database: Query rate_limits table
    Database-->>RateLimit: Current count
    RateLimit-->>APIRoute: Allow/Deny

    alt Rate Limit Exceeded
        APIRoute->>Logger: serverLogger.warn('rate_limited')
        APIRoute-->>Browser: 429 Too Many Requests
    end

    APIRoute->>Database: Verify ownership (RLS)
    Database-->>APIRoute: Access granted

    APIRoute->>External: Call external API
    External-->>APIRoute: Response

    APIRoute->>Database: Save result
    Database-->>APIRoute: Success

    APIRoute->>Database: Log to user_activity_history

    APIRoute->>Logger: serverLogger.info('success', {duration})
    Logger->>Axiom: Batch log event

    APIRoute-->>Browser: 200 OK with data
```

### Error Handling Flow

```mermaid
graph TB
    Request[Incoming Request] --> TryCatch{Try Block}

    TryCatch -->|Success| Response[Success Response]
    TryCatch -->|Error| ErrorType{Error Type}

    ErrorType -->|Validation Error| LogWarn[serverLogger.warn]
    ErrorType -->|Auth Error| LogWarn
    ErrorType -->|Rate Limit| LogWarn
    ErrorType -->|Server Error| LogError[serverLogger.error]
    ErrorType -->|External API Error| LogError

    LogWarn --> CleanResponse[Sanitize Error Message]
    LogError --> Cleanup[Cleanup Resources]
    Cleanup --> CleanResponse

    CleanResponse --> SendError[Send Error Response]

    LogWarn --> Axiom[Axiom Log Aggregation]
    LogError --> Axiom

    Response --> Client[Client Receives Response]
    SendError --> Client
```

### Resource Cleanup Pattern

All API routes follow this pattern for resource cleanup:

```typescript
try {
  // 1. Validate input
  // 2. Check auth
  // 3. Perform operation
  // 4. Save to database

  const { data, error } = await supabase
    .from('table')
    .insert(record);

  if (error) {
    // CRITICAL: Clean up any uploaded files
    await supabase.storage
      .from('bucket')
      .remove([filePath]);

    throw new Error('Database insert failed');
  }

  // 5. Log success
  serverLogger.info({event: 'operation.success'});

  return NextResponse.json({ data });
} catch (error) {
  // 6. Log error with context
  serverLogger.error({
    error,
    event: 'operation.error'
  }, 'Operation failed');

  return NextResponse.json(
    { error: 'Message' },
    { status: 500 }
  );
}
```

---

## Code Quality & Best Practices

### TypeScript Strict Mode
- All files use TypeScript with strict mode enabled
- No `any` types in production code
- Comprehensive interface definitions
- Type-safe database queries

### Component Best Practices
```typescript
/**
 * Main video editor component with timeline, preview, and asset management.
 *
 * Features:
 * - Multi-track timeline editing with drag-drop support
 * - Real-time preview with RAF-based synchronization
 * - Auto-save with 2-second debounce
 * - Undo/redo with 50-action history
 *
 * @example
 * ```tsx
 * <BrowserEditorClient projectId="uuid" />
 * ```
 */
export function BrowserEditorClient({ projectId }: Props) {
  // Component implementation
}
```

### API Route Best Practices
```typescript
/**
 * POST /api/video/generate
 *
 * Generates video using Google Veo 3.1 based on text prompt.
 *
 * Request body:
 * - prompt: string (1-1000 chars) - Video generation prompt
 * - duration: number (5-60) - Video duration in seconds
 * - projectId: string (UUID) - Target project ID
 *
 * Response:
 * - operationName: string - Long-running operation ID for polling
 *
 * Rate limit: 5 requests per minute per user
 *
 * @throws 401 - Unauthorized
 * @throws 429 - Rate limit exceeded
 * @throws 503 - Veo API unavailable
 */
export async function POST(req: NextRequest) {
  // Route implementation
}
```

### Custom Hook Documentation
```typescript
/**
 * Polls an endpoint at regular intervals until a condition is met.
 *
 * @param endpoint - API endpoint to poll
 * @param interval - Polling interval in milliseconds (default: 2000)
 * @param maxAttempts - Maximum number of attempts (default: 60)
 * @param isDone - Function to check if polling should stop
 *
 * @returns Polling state with data, loading, and error
 *
 * @example
 * ```tsx
 * const { data, loading } = usePolling(
 *   `/api/video/status?id=${opId}`,
 *   2000,
 *   60,
 *   (data) => data.done === true
 * );
 * ```
 */
export function usePolling<T>(...) {
  // Hook implementation
}
```

---

## Security Hardening

### Implemented Security Measures

1. **Input Validation**
   - UUID format validation (regex)
   - String length limits
   - Type checking for all inputs
   - Path traversal prevention

2. **Authentication & Authorization**
   - HTTP-only session cookies
   - Row-Level Security (RLS) on all tables
   - Asset ownership verification
   - Admin role verification

3. **Rate Limiting**
   - Per-user, per-endpoint limits
   - Expensive operations: 5 req/min
   - Standard operations: 60 req/min
   - Database-backed tracking

4. **Error Handling**
   - No stack traces in production
   - Generic error messages to clients
   - Detailed logs to Axiom only
   - Resource cleanup on errors

5. **Secure File Access**
   - Signed URLs (1-hour expiry)
   - User ID verification
   - Storage bucket policies
   - No direct file access

6. **API Security**
   - CSRF protection (Next.js)
   - CORS configuration
   - Timeout protection (60s max)
   - Request size limits

---

## Testing Strategy

### Unit Tests
- Component rendering
- Hook behavior
- Utility functions
- State management

### Integration Tests
- API route responses
- Database operations
- External service mocks
- Authentication flows

### E2E Tests
- Timeline editing workflow
- Video generation flow
- Asset upload and management
- Subscription checkout

### Test Coverage Goals
- API Routes: 80%+
- Components: 70%+
- Utilities: 90%+
- Critical paths: 100%

---

**Last Updated**: 2025-10-23
**Version**: 2.0.0
**Maintainer**: Development Team
**Total LOC**: ~46,307 lines
**API Routes**: 30+
**Components**: 24+
**Custom Hooks**: 8
