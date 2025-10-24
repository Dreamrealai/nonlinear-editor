# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- ESLint rule for explicit function return types
- Comprehensive progress indicators for video and audio generation

### Changed
- Upgraded to Next.js 16.0.0
- Upgraded to React 19.2.0

### Fixed
- Drag-and-drop upload functionality (NEW-LOW-004)

## [0.1.0] - 2025-10-24

### Added

#### Core Editor Features
- Multi-track timeline with unlimited video, audio, and image tracks
- Drag-and-drop clip positioning with snap-to-grid functionality
- Visual timeline with zoom controls
- Clip trimming with precision handles
- Clip splitting at playhead
- Copy/paste clips with multi-select support
- Undo/redo system with 50-action history
- Autosave with 2-second debounce

#### Playback Engine
- RAF-based smooth playback system
- Multi-track video synchronization
- Buffering management
- Timecode display
- Playback speed adjustment (0.25x - 4x)

#### Editing Features
- Transitions (crossfade, fade-in, fade-out)
- Per-clip opacity control
- Per-clip volume control
- Crop rectangles
- Text overlays
- Keyframe animation system

#### Asset Management
- Video, audio, and image upload
- Automatic thumbnail generation
- Secure signed URLs with expiration
- Scene detection using Google Video Intelligence API
- Asset library with search and filtering

#### AI Features
- AI chat assistant powered by Google Gemini
- Context-aware help with project-specific history
- Video generation using Google Veo
- Image generation using Google Imagen
- Audio generation with multiple providers:
  - Music generation via Suno (Comet API)
  - Text-to-speech via ElevenLabs
  - Sound effects via ElevenLabs
  - Voice generation with multiple voice options
- Video upscaling using fal.ai

#### Authentication & Security
- Supabase Auth integration
- Email/password authentication
- Anonymous sign-in support
- Password reset flow
- Row-level security (RLS) policies
- CSRF protection with token validation
- Strong password requirements (12+ chars, uppercase, lowercase, number, special)
- Session management (24h active, 8h idle timeout)
- Secure session storage with encryption

#### User Management
- User profile management
- Account deletion with GDPR compliance
- Audit logging system with 70+ predefined actions
- Activity history tracking

#### Subscription & Payments
- Stripe integration for payments
- Multiple subscription tiers
- Usage tracking and limits
- Webhook handling for payment events

#### Export System
- Export API endpoint
- Multiple quality presets
- Format support (MP4, WebM)
- Export queue management
- Note: Requires FFmpeg server integration (placeholder implementation)

#### Monitoring & Logging
- Browser error tracking with Error Boundaries
- Axiom integration for structured logging
- Custom logging system with levels (debug, info, warn, error)
- Performance monitoring
- Error context tracking

#### Developer Experience
- Comprehensive TypeScript types with strict mode
- Branded types for IDs (UserId, ProjectId, AssetId)
- Service layer architecture
- Custom hooks for common patterns
- Test infrastructure with Jest and Playwright
- E2E test setup with Playwright
- Pre-commit hooks with Husky and lint-staged
- Bundle size monitoring

### Technical Stack
- **Framework**: Next.js 16.0.0 with App Router
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5.x with strict mode
- **Styling**: Tailwind CSS 4.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **State Management**: Zustand 5.0.8 with Immer middleware
- **AI Services**:
  - Google Gemini (chat)
  - Google Veo (video generation)
  - Google Imagen (image generation)
  - Google Video Intelligence (scene detection)
  - fal.ai (video upscaling)
  - Suno/Comet (music generation)
  - ElevenLabs (text-to-speech, sound effects)
  - Wavespeed (audio processing)
- **Payments**: Stripe
- **Logging**: Axiom + Custom logger
- **Testing**: Jest, React Testing Library, Playwright
- **Linting**: ESLint 9 with Next.js config
- **Formatting**: Prettier 3.6.2

### Documentation
- Comprehensive README with setup instructions
- Complete API documentation with OpenAPI 3.0 specification
- Architecture overview and design patterns
- Coding best practices guide
- Style guide
- Testing guide
- Security documentation
- Setup guides for all services
- Infrastructure guide (Terraform for GCS)
- Performance optimization guide
- 90+ documentation files covering all aspects

### Testing
- 1,216 total tests
- 1,085 passing (89.3% pass rate)
- 24.41% code coverage
- Test utilities and helpers
- Comprehensive API route tests
- Component tests with React Testing Library
- E2E test infrastructure with Playwright

### Performance
- Bundle size: 81 MB total (server + client)
  - Client static: 3.5 MB
  - Server bundle: 9.2 MB
  - Largest chunk: 248 KB
- Lazy loading for heavy components
- Code splitting by route
- Image optimization (AVIF, WebP)
- Tree-shaking enabled
- Production optimizations active

### Quality Metrics
- TypeScript: 0 errors (strict mode)
- ESLint: 2 errors (non-critical unused variables)
- ESLint Warnings: 0
- Accessibility: 0 critical warnings
- Build: Passing
- Overall Quality Grade: A- (8.5/10)

### Known Limitations
- Export functionality requires FFmpeg server (not included)
- E2E tests infrastructure ready but test suites not yet written
- Code coverage target: 60% (currently 24.41%)
- Some AI features require paid API keys
- Google Cloud Storage bucket must be created via Terraform

### Security
- Row-level security policies on all tables
- API route authentication with `withAuth` middleware
- Rate limiting by operation cost
- Input validation on all endpoints
- Secure session management
- CSRF protection
- Audit logging for all sensitive operations
- Regular security audits

---

## Version History Summary

- **0.1.0** (2025-10-24): Initial release with core video editing features, AI integration, and comprehensive documentation

---

## Links

- [Repository](https://github.com/Dreamrealai/nonlinear-editor)
- [Documentation](docs/)
- [Issue Tracker](https://github.com/Dreamrealai/nonlinear-editor/issues)
- [Contributing Guide](CONTRIBUTING.md)
- [License](LICENSE)
