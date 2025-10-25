# Documentation Structure

**Last Updated:** 2025-10-24 (After Agent 4 Consolidation)
**Total Files:** 102 (7 root + 95 docs)

---

## Project Root (7 files)

```
/
├── CHANGELOG.md                              # Project version history
├── CLAUDE.md                                 # Project memory & coding guidelines ⭐
├── CONTRIBUTING.md                           # Contribution guidelines
├── DOCUMENTATION_CONSOLIDATION_SUMMARY.md    # Consolidation report
├── DOCUMENTATION_STRUCTURE.md                # This file - documentation map
├── EASTER_EGGS.md                            # Easter egg documentation
├── ISSUES.md                                 # CANONICAL ISSUE TRACKER ⭐⭐⭐
└── README.md                                 # Project overview & quick start
```

---

## Documentation Directory Structure (95 files)

```
/docs/
│
├── Core Documentation (13 files in /docs/)
│   ├── ACCESSIBILITY.md                      # Accessibility standards
│   ├── ANALYTICS_AND_MONITORING.md           # Analytics integration
│   ├── API_VERSIONING.md                     # API versioning strategy
│   ├── ARCHITECTURE_OVERVIEW.md              # System architecture ⭐
│   ├── AXIOM_SETUP.md                        # Axiom logging setup
│   ├── CODING_BEST_PRACTICES.md              # Coding standards ⭐
│   ├── E2E_CI_CD_SETUP.md                    # E2E CI/CD configuration
│   ├── E2E_TESTING_GUIDE.md                  # E2E testing guide
│   ├── EASTER_EGG_METRICS.md                 # Easter egg analytics
│   ├── INFRASTRUCTURE.md                     # Infrastructure overview
│   ├── KEYBOARD_SHORTCUTS.md                 # Application shortcuts
│   ├── LOADING_COMPONENTS.md                 # Loading component patterns
│   ├── LOGGING.md                            # Logging standards
│   ├── MEMORY_OPTIMIZATION_GUIDE.md          # Memory optimization
│   ├── MIDDLEWARE_PATTERNS.md                # Middleware patterns
│   ├── MOCK_PATTERNS_DOCUMENTATION.md        # Testing mock patterns
│   ├── MONITORING_INTEGRATION_EXAMPLES.md    # Monitoring examples
│   ├── ONBOARDING_METRICS.md                 # Onboarding analytics
│   ├── PERFORMANCE_BUDGET.md                 # Performance budget
│   ├── PROJECT_STATUS.md                     # Current project status
│   ├── RATE_LIMITING.md                      # Rate limiting strategies
│   ├── README.md                             # Docs overview
│   ├── SECURITY_BEST_PRACTICES.md            # Security patterns ⭐
│   ├── SECURITY_DEPLOYMENT_GUIDE.md          # Security deployment
│   ├── SECURITY_TEST_COVERAGE.md             # Security test coverage
│   ├── SERVICE_LAYER_GUIDE.md                # Business logic patterns ⭐
│   ├── STYLE_GUIDE.md                        # Code formatting ⭐
│   ├── SUPABASE_CONNECTION_POOLING.md        # Connection pooling
│   ├── SUPABASE_SETUP.md                     # Supabase setup
│   ├── TESTING.md                            # Testing guidelines ⭐
│   └── USER_TESTING_ONBOARDING.md            # User testing guide
│
├── /api/ - API Documentation (21+ files)
│   ├── README.md                             # API overview
│   ├── API_DOCUMENTATION.md                  # Comprehensive API docs ⭐
│   ├── API_DOCUMENTATION_SUMMARY.md          # Summary overview
│   ├── API_EXAMPLES.md                       # API usage examples
│   ├── API_EXAMPLES_EXTENDED.md              # Extended examples
│   ├── API_QUICK_REFERENCE.md                # Quick reference
│   ├── API_QUICK_START.md                    # Quick start guide
│   ├── MASTER_API_AUDIT_SUMMARY.md           # API audit results
│   ├── WEBHOOKS.md                           # Webhook documentation
│   │
│   ├── Third-party API Documentation
│   │   ├── axiom-api-docs.md                 # Axiom logging API
│   │   ├── comet-suno-api-docs.md            # Comet/Suno API
│   │   ├── elevenlabs-api-docs.md            # ElevenLabs TTS API
│   │   ├── fal-ai-docs.md                    # FAL.ai API
│   │   ├── fal-kling.md                      # FAL Kling integration
│   │   ├── fal-minimax.md                    # FAL MiniMax integration
│   │   ├── fal-pixverse.md                   # FAL Pixverse integration
│   │   ├── fal-sora-2.md                     # FAL Sora 2 integration
│   │   ├── google-ai-studio-docs.md          # Google AI Studio
│   │   ├── google-vertex-ai-docs.md          # Google Vertex AI
│   │   ├── minimax.md                        # MiniMax API
│   │   ├── resend-api-docs.md                # Resend email API
│   │   ├── stripe-api-docs.md                # Stripe payment API
│   │   ├── supabase-api-docs.md              # Supabase API
│   │   └── vercel-api-docs.md                # Vercel deployment API
│   │
│   └── /providers/ - Provider-specific Documentation
│       ├── README.md                         # Providers overview
│       ├── SUNO_COMET.md                     # Suno/Comet provider
│       │
│       ├── /elevenlabs/
│       │   ├── ELEVENLABS_FAL.md             # ElevenLabs via FAL
│       │   └── ELEVENLABS_TTS.md             # ElevenLabs TTS
│       │
│       └── /google/
│           ├── README.md                     # Google APIs overview
│           ├── CLOUD_VISION.md               # Cloud Vision API
│           ├── GEMINI.md                     # Gemini API
│           ├── IMAGEN.md                     # Imagen API
│           ├── VEO2.md                       # Veo 2 API
│           ├── VEO3.md                       # Veo 3 API
│           │
│           └── /google-ai-apis/
│               ├── README.md                 # Google AI APIs
│               ├── gemini-models.md          # Gemini models
│               ├── imagen-api.md             # Imagen API details
│               └── veo-api.md                # Veo API details
│
├── /architecture/ - Architecture Documentation (2 files)
│   ├── ARCHITECTURE_STANDARDS.md             # Architecture standards
│   └── REACT_PATTERNS.md                     # React patterns
│
├── /guides/ - Implementation Guides (3 files)
│   ├── CACHING.md                            # Caching guide ⭐
│   ├── ERROR_TRACKING.md                     # Error tracking
│   └── PERFORMANCE.md                        # Performance optimization ⭐
│
├── /migrations/ - Migration Documentation (1 file)
│   └── TIMELINE_STATE_DEPRECATION.md         # Timeline state migration
│
├── /monitoring/ - Monitoring Documentation (3 files)
│   ├── ALERTS.md                             # Alert configuration
│   ├── DASHBOARDS.md                         # Dashboard setup
│   └── QUERIES.md                            # Monitoring queries
│
├── /security/ - Security Documentation (3 files)
│   ├── CORS_SECURITY_IMPLEMENTATION_SUMMARY.md  # CORS implementation
│   ├── SECURITY.md                           # Security overview
│   └── SECURITY_BEST_PRACTICES.md            # Security best practices ⭐
│
├── /setup/ - Setup & Configuration (8 files)
│   ├── CONFIGURATION.md                      # Configuration overview
│   ├── ENVIRONMENT_VARIABLES.md              # Environment variables ⭐
│   ├── ENV_VARIABLES_SUMMARY.md              # Quick reference
│   ├── RESEND_SETUP.md                       # Resend email setup
│   ├── SETUP_LOCAL_EMAIL.md                  # Local email testing
│   ├── STRIPE_SETUP.md                       # Stripe integration
│   ├── SUBSCRIPTION_SETUP.md                 # Subscription setup
│   ├── VERCEL_CONFIGURATION.md               # Vercel deployment
│   └── VERCEL_ENV_SETUP.md                   # Vercel environment
│
└── /user-guide/ - User Documentation (5 files)
    ├── ASSET_MANAGEMENT.md                   # Asset management guide
    ├── FAQ.md                                # Frequently asked questions
    ├── ONBOARDING.md                         # User onboarding
    ├── TIMELINE_EDITING.md                   # Timeline editing guide
    └── VIDEO_TUTORIAL_SCRIPTS.md             # Tutorial scripts
```

---

## Key Documents (⭐ = Essential Reading)

### For Developers

1. **CLAUDE.md** - Project memory, coding guidelines, git workflow
2. **ISSUES.md** - Canonical issue tracker (23 open, 51 fixed)
3. **docs/ARCHITECTURE_OVERVIEW.md** - System architecture
4. **docs/CODING_BEST_PRACTICES.md** - Comprehensive coding standards
5. **docs/STYLE_GUIDE.md** - Code formatting conventions
6. **docs/SERVICE_LAYER_GUIDE.md** - Business logic patterns

### For API Development

1. **docs/api/API_DOCUMENTATION.md** - Complete API reference
2. **docs/api/API_QUICK_START.md** - Getting started with APIs
3. **docs/security/SECURITY_BEST_PRACTICES.md** - Security patterns

### For Setup & Deployment

1. **docs/setup/ENVIRONMENT_VARIABLES.md** - Environment configuration
2. **docs/setup/VERCEL_CONFIGURATION.md** - Deployment setup
3. **docs/SUPABASE_SETUP.md** - Database setup

### For Testing

1. **docs/TESTING.md** - Testing guidelines
2. **docs/E2E_TESTING_GUIDE.md** - E2E testing
3. **docs/MOCK_PATTERNS_DOCUMENTATION.md** - Mock patterns

### For Performance & Optimization

1. **docs/guides/PERFORMANCE.md** - Performance optimization
2. **docs/guides/CACHING.md** - Caching strategies
3. **docs/MEMORY_OPTIMIZATION_GUIDE.md** - Memory optimization

---

## Archive Structure

Historical reports and outdated documentation preserved in:

```
/archive/
├── ARCHIVED_FILES_LIST.txt (145 files)
├── CONSOLIDATION_DETAILS.md (archiving details)
├── (31 files from root and /docs/)
├── /reports/ (39 files from /docs/reports/)
└── (Previous archives: 88 files)
```

---

## Document Management Protocol

**From CLAUDE.md:**

Before creating ANY new documentation:

1. ✅ Check if ISSUES.md can be updated instead
2. ✅ Search for existing documentation on the topic
3. ✅ Verify this is not duplicate information
4. ✅ Only create if truly necessary

**Single Sources of Truth:**

- **ISSUES.md** - ALL codebase issues (never create ISSUES_2.md)
- **CLAUDE.md** - Project memory and guidelines
- **docs/** - Permanent documentation organized by category

**Archive Protocol:**

- Historical reports → /archive/
- Outdated analysis → /archive/
- Completed work documentation → /archive/

---

## Statistics

- **Total Active Files:** 102 (7 root + 95 docs)
- **Total Archived Files:** 145 (safely preserved)
- **Reduction from Previous:** 36% (158 → 102 files)
- **Documentation Categories:** 10 main categories
- **Canonical Issue Tracker:** ISSUES.md (116KB, actively maintained)

---

**Last Consolidation:** 2025-10-24 by Agent 4
**Next Review:** Quarterly or when 10+ new reports accumulate
**Maintenance:** Follow CLAUDE.md document management protocol
