# Documentation Index

This directory contains all project documentation organized for easy discovery and navigation.

## 🚀 Quick Start

### New to the Project?

Start here for essential onboarding documentation:

1. **[Getting Started](/docs/getting-started/)** - Setup guides and configuration
2. **[Architecture Overview](/docs/ARCHITECTURE_OVERVIEW.md)** - System design and patterns
3. **[Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)** - Code standards and patterns
4. **[Project Status](/docs/PROJECT_STATUS.md)** - Current status and active workstreams

### Looking for Something Specific?

- **APIs** → [`/docs/api/`](#api---api-documentation)
- **Performance** → [`/docs/guides/PERFORMANCE.md`](/docs/guides/PERFORMANCE.md)
- **Caching** → [`/docs/guides/CACHING.md`](/docs/guides/CACHING.md)
- **Security** → [`/docs/security/`](#security---security-documentation)
- **Testing** → [`/docs/TESTING.md`](/docs/TESTING.md)
- **Setup** → [`/docs/setup/`](#setup---configuration-guides)

---

## 📁 Directory Structure

### `/guides/` - Implementation Guides

**NEW!** Comprehensive guides for key system features:

- **[PERFORMANCE.md](./guides/PERFORMANCE.md)** - Complete performance optimization guide
  - Web Vitals tracking
  - React & bundle optimization
  - Database query optimization
  - Caching strategies
  - Memory management
  - Monitoring & metrics

- **[CACHING.md](./guides/CACHING.md)** - Complete caching layer guide
  - Quick start & usage
  - Architecture overview
  - Implementation details
  - Cache invalidation strategies
  - Performance impact (80-90% query reduction)
  - Monitoring & troubleshooting

### `/getting-started/` - Setup and Configuration

**NEW!** Essential setup documentation for new developers:

- Coming soon: Comprehensive getting-started guides
- Environment variables documentation (currently in `/setup/`)

### `/api/` - API Documentation

Complete API documentation for all services, endpoints, and external integrations.

**Core API Documentation:**

- [API_DOCUMENTATION.md](./api/API_DOCUMENTATION.md) - Complete API reference for all endpoints
- [API_DOCUMENTATION_SUMMARY.md](./api/API_DOCUMENTATION_SUMMARY.md) - API documentation summary
- [API_QUICK_REFERENCE.md](./api/API_QUICK_REFERENCE.md) - Quick reference guide
- [API_EXAMPLES.md](./api/API_EXAMPLES.md) - Code examples for common API operations

**Service Provider Documentation:**

- **[`/api/providers/google/`](./api/providers/google/)** - Google AI & Cloud services
  - [VEO2.md](./api/providers/google/VEO2.md) - Veo 2 video generation
  - [VEO3.md](./api/providers/google/VEO3.md) - Veo 3 video generation
  - [GEMINI.md](./api/providers/google/GEMINI.md) - Gemini multimodal AI
  - [IMAGEN.md](./api/providers/google/IMAGEN.md) - Imagen image generation
  - [CLOUD_VISION.md](./api/providers/google/CLOUD_VISION.md) - Cloud Vision video analysis
  - [README.md](./api/providers/google/README.md) - Google provider overview

- **[`/api/providers/elevenlabs/`](./api/providers/elevenlabs/)** - Audio generation services
  - [ELEVENLABS_TTS.md](./api/providers/elevenlabs/ELEVENLABS_TTS.md) - ElevenLabs text-to-speech
  - [ELEVENLABS_FAL.md](./api/providers/elevenlabs/ELEVENLABS_FAL.md) - FAL ElevenLabs integration

- **[`/api/providers/`](./api/providers/)** - Other providers
  - [SUNO_COMET.md](./api/providers/SUNO_COMET.md) - Suno/Comet audio generation

**External Service APIs:**

- [axiom-api-docs.md](./api/axiom-api-docs.md) - Axiom logging service
- [comet-suno-api-docs.md](./api/comet-suno-api-docs.md) - Comet/Suno audio generation
- [elevenlabs-api-docs.md](./api/elevenlabs-api-docs.md) - ElevenLabs text-to-speech
- [fal-ai-docs.md](./api/fal-ai-docs.md) - FAL.AI services
- [google-ai-studio-docs.md](./api/google-ai-studio-docs.md) - Google AI Studio
- [google-vertex-ai-docs.md](./api/google-vertex-ai-docs.md) - Google Vertex AI
- [resend-api-docs.md](./api/resend-api-docs.md) - Resend email service
- [stripe-api-docs.md](./api/stripe-api-docs.md) - Stripe payment integration
- [supabase-api-docs.md](./api/supabase-api-docs.md) - Supabase database & auth
- [vercel-api-docs.md](./api/vercel-api-docs.md) - Vercel deployment

**Video Generation APIs:**

- [fal-kling.md](./api/fal-kling.md) - Kling video generation
- [fal-minimax.md](./api/fal-minimax.md) - Minimax video generation
- [fal-pixverse.md](./api/fal-pixverse.md) - Pixverse video generation
- [fal-sora-2.md](./api/fal-sora-2.md) - Sora 2 video generation
- [minimax.md](./api/minimax.md) - Minimax API

**API Audit Reports:**

- [FIXES_APPLIED.md](./api/FIXES_APPLIED.md) - API fixes applied
- [MASTER_API_AUDIT_SUMMARY.md](./api/MASTER_API_AUDIT_SUMMARY.md) - Master audit summary
- [PARAMETER_AUDIT_REPORT.md](./api/PARAMETER_AUDIT_REPORT.md) - Parameter validation audit
- [VALIDATION_REPORT.md](./api/VALIDATION_REPORT.md) - Validation implementation report

### `/architecture/` - Architecture and Standards

Documentation about the project architecture, coding standards, and design patterns.

- [ARCHITECTURE_STANDARDS.md](./architecture/ARCHITECTURE_STANDARDS.md) - Project architecture standards and guidelines
- [REACT_PATTERNS.md](./architecture/REACT_PATTERNS.md) - React component patterns and best practices

### `/security/` - Security Documentation

Security policies, audits, and implementation guides.

- [SECURITY.md](./security/SECURITY.md) - Security policy and guidelines
- [SECURITY_AUDIT.md](./security/SECURITY_AUDIT.md) - Security audit results
- [CORS_SECURITY_IMPLEMENTATION_SUMMARY.md](./security/CORS_SECURITY_IMPLEMENTATION_SUMMARY.md) - CORS security implementation summary

### `/setup/` - Configuration Guides

Configuration and setup instructions for various services and environments.

- [CONFIGURATION.md](./setup/CONFIGURATION.md) - General configuration guide
- [ENVIRONMENT_VARIABLES.md](./setup/ENVIRONMENT_VARIABLES.md) - Environment variables documentation
- [ENV_VARIABLES_SUMMARY.md](./setup/ENV_VARIABLES_SUMMARY.md) - Environment variables summary
- [RESEND_SETUP.md](./setup/RESEND_SETUP.md) - Resend email service setup
- [SETUP_LOCAL_EMAIL.md](./setup/SETUP_LOCAL_EMAIL.md) - Local email testing setup
- [STRIPE_SETUP.md](./setup/STRIPE_SETUP.md) - Stripe payment integration setup
- [SUBSCRIPTION_SETUP.md](./setup/SUBSCRIPTION_SETUP.md) - Subscription system setup
- [VERCEL_CONFIGURATION.md](./setup/VERCEL_CONFIGURATION.md) - Vercel deployment configuration
- [VERCEL_ENV_SETUP.md](./setup/VERCEL_ENV_SETUP.md) - Vercel environment setup

### `/issues/` - Issue Tracking

Issue tracking and resolution reports.

- [ISSUETRACKING.md](./issues/ISSUETRACKING.md) - Main issue tracking document
- [MED-020-ARCHITECTURE-FIXES-REPORT.md](./issues/MED-020-ARCHITECTURE-FIXES-REPORT.md) - MED-020 architecture fixes
- [MED-023-ARCHITECTURE-FIXES-REPORT.md](./issues/MED-023-ARCHITECTURE-FIXES-REPORT.md) - MED-023 architecture fixes
- [MED-023-QUICK-REFERENCE.md](./issues/MED-023-QUICK-REFERENCE.md) - MED-023 quick reference
- [MED-024_RESOLUTION_REPORT.md](./issues/MED-024_RESOLUTION_REPORT.md) - MED-024 resolution report

### `/reports/` - Audit Reports and Analysis

Comprehensive reports, audit logs, validation reports, and codebase analysis.

**Recent Key Reports:**

- [TEST_SUCCESS_REPORT.md](./reports/TEST_SUCCESS_REPORT.md) - Current test status (87.3% pass rate)
- [FINAL_QUALITY_AUDIT.md](./reports/FINAL_QUALITY_AUDIT.md) - Code quality assessment (B+ / 7.2/10)
- [BUNDLE_ANALYSIS.md](./reports/BUNDLE_ANALYSIS.md) - Bundle size optimization analysis

**Implementation Reports:**

- [AUDIT_LOGGING_IMPLEMENTATION.md](./reports/AUDIT_LOGGING_IMPLEMENTATION.md) - Audit logging implementation
- [CACHING_IMPLEMENTATION.md](./reports/CACHING_IMPLEMENTATION.md) - Caching layer implementation report
- [E2E-IMPLEMENTATION-REPORT.md](./reports/E2E-IMPLEMENTATION-REPORT.md) - End-to-end testing implementation

**Analysis & Audits:**

- [AUTHENTICATION_AND_SUBSCRIPTION_ANALYSIS.md](./reports/AUTHENTICATION_AND_SUBSCRIPTION_ANALYSIS.md) - Authentication and subscription analysis
- [CODEBASE_ANALYSIS.md](./reports/CODEBASE_ANALYSIS.md) - Comprehensive codebase analysis
- [COMPREHENSIVE_EVALUATION_REPORT.md](./reports/COMPREHENSIVE_EVALUATION_REPORT.md) - Comprehensive project evaluation
- [QUALITY_VALIDATION_REPORT.md](./reports/QUALITY_VALIDATION_REPORT.md) - Quality validation report

**[Full Reports List →](./reports/)**

---

## 📖 Core Documentation (Root Level)

Essential guides and references in the docs directory:

**System Architecture & Design:**

- [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) - System architecture and design patterns
- [CODING_BEST_PRACTICES.md](./CODING_BEST_PRACTICES.md) - Essential coding patterns and standards
- [STYLE_GUIDE.md](./STYLE_GUIDE.md) - Code formatting and conventions
- [SERVICE_LAYER_GUIDE.md](./SERVICE_LAYER_GUIDE.md) - Service layer architecture guide

**Infrastructure & Operations:**

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Infrastructure overview and deployment
- [AXIOM_SETUP.md](./AXIOM_SETUP.md) - Axiom logging setup guide
- [LOGGING.md](./LOGGING.md) - Logging implementation guide
- [RATE_LIMITING.md](./RATE_LIMITING.md) - Rate limiting implementation
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase setup and configuration

**Testing & Quality:**

- [TESTING.md](./TESTING.md) - Testing guide and best practices
- [TEST_FIXES_GUIDE.md](./TEST_FIXES_GUIDE.md) - Test fixing guide
- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - End-to-end testing guide
- [E2E_CI_CD_SETUP.md](./E2E_CI_CD_SETUP.md) - E2E CI/CD setup
- [E2E_TEST_RESULTS.md](./E2E_TEST_RESULTS.md) - E2E test results

**Project Management:**

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Comprehensive project status dashboard
- [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) - Editor keyboard shortcuts

**Security & Compliance:**

- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - Security audit report
- [SECURITY_RECOMMENDATIONS.md](./SECURITY_RECOMMENDATIONS.md) - Security recommendations
- [SECURITY_DEPLOYMENT_GUIDE.md](./SECURITY_DEPLOYMENT_GUIDE.md) - Security deployment guide
- [SECURITY_TEST_COVERAGE.md](./SECURITY_TEST_COVERAGE.md) - Security test coverage

**Performance & Optimization:**

- [MEMORY_OPTIMIZATION_GUIDE.md](./MEMORY_OPTIMIZATION_GUIDE.md) - Memory optimization guide
- [MEMORY_LEAK_VERIFICATION_REPORT.md](./MEMORY_LEAK_VERIFICATION_REPORT.md) - Memory leak verification
- [PRODUCTION_MONITORING_MEMORY_LEAKS.md](./PRODUCTION_MONITORING_MEMORY_LEAKS.md) - Production memory monitoring
- [POLLING_CLEANUP_FIX.md](./POLLING_CLEANUP_FIX.md) - Polling cleanup fixes
- [ACCESSIBILITY_FIXES.md](./ACCESSIBILITY_FIXES.md) - Accessibility improvements

**API & Integration:**

- [API_VERSIONING.md](./API_VERSIONING.md) - API versioning strategy

---

## 🔍 Quick Links

| Category            | Link                                                                                | Description                    |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| **Getting Started** | [/setup/](./setup/)                                                                 | Configuration and setup guides |
| **API Reference**   | [/api/API_QUICK_REFERENCE.md](./api/API_QUICK_REFERENCE.md)                         | Quick API reference            |
| **Security**        | [/security/SECURITY.md](./security/SECURITY.md)                                     | Security policies              |
| **Issue Tracking**  | [/issues/ISSUETRACKING.md](./issues/ISSUETRACKING.md)                               | Issue tracking                 |
| **Architecture**    | [/architecture/ARCHITECTURE_STANDARDS.md](./architecture/ARCHITECTURE_STANDARDS.md) | Architecture standards         |
| **Performance**     | [/guides/PERFORMANCE.md](./guides/PERFORMANCE.md)                                   | Performance optimization       |
| **Caching**         | [/guides/CACHING.md](./guides/CACHING.md)                                           | Caching implementation         |
| **Testing**         | [TESTING.md](./TESTING.md)                                                          | Testing practices              |

---

## 📚 Historical Documentation

For historical reports and superseded documentation, see:

- **[/archive/](../archive/)** - Archived reports and session summaries
- **[/archive/ARCHIVE_INDEX.md](../archive/ARCHIVE_INDEX.md)** - Complete index of archived files

The archive contains completed work, resolved issues, and optimization reports that document the project's journey to production readiness.

---

## 🧭 Navigation

Return to the [main README](../README.md) for project overview and getting started information.

---

**Last Updated**: 2025-10-24
**Documentation Files**: 128 files
**Key Consolidations**: Performance (2→1), Caching (4→1), API providers (organized by vendor)
