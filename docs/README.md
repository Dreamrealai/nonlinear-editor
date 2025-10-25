# Documentation Index

**Complete documentation for the Non-Linear Video Editor project.**

Last Updated: 2025-10-25

---

## Quick Start

New to the project? Start here:

1. **[Environment Setup](./setup/ENVIRONMENT_SETUP.md)** - Configure your development environment
2. **[Supabase Setup](./SUPABASE_SETUP.md)** - Set up database and authentication
3. **[Testing Guide](./TESTING_GUIDE.md)** - Run and write tests
4. **[Features](./FEATURES.md)** - Explore available features

---

## Core Documentation

### Getting Started

- **[Environment Setup](./setup/ENVIRONMENT_SETUP.md)** - Environment variables and configuration
- **[Supabase Setup](./SUPABASE_SETUP.md)** - Database, auth, and storage setup
- **[Supabase Auto-Deployment](./setup/SUPABASE_AUTO_DEPLOYMENT.md)** - Automated migration deployment

### Architecture & Development

- **[Architecture Overview](./ARCHITECTURE_OVERVIEW.md)** - System design and patterns
- **[Coding Best Practices](./CODING_BEST_PRACTICES.md)** - TypeScript, React, and service patterns
- **[Style Guide](./STYLE_GUIDE.md)** - Code formatting and conventions
- **[Service Layer Guide](./SERVICE_LAYER_GUIDE.md)** - Business logic patterns

### Features & API

- **[Features](./FEATURES.md)** - Complete feature inventory
- **[Features Backlog](./FEATURES_BACKLOG.md)** - Planned features and roadmap
- **[API Guide](./api/API_GUIDE.md)** - API documentation and authentication
- **[API Reference](./api/API_REFERENCE.md)** - Comprehensive API examples
- **[Webhooks](./api/WEBHOOKS.md)** - Webhook implementation

### Testing

- **[Testing Guide](./TESTING_GUIDE.md)** - Complete testing documentation
- **[Testing Utilities](./TESTING_UTILITIES.md)** - Test helper reference
- **[Integration Testing](./INTEGRATION_TESTING_GUIDE.md)** - Integration test patterns
- **[E2E Testing](./E2E_TESTING_GUIDE.md)** - End-to-end testing
- **[Test Troubleshooting](./TEST_TROUBLESHOOTING.md)** - Common issues and fixes

### Security

- **[Security Guide](./security/SECURITY_GUIDE.md)** - Security best practices
- **[Security Deployment](./security/SECURITY_DEPLOYMENT_GUIDE.md)** - Production security
- **[CORS Implementation](./security/CORS_SECURITY_IMPLEMENTATION_SUMMARY.md)** - CORS configuration

### Deployment & Operations

- **[Deployment Instructions](./DEPLOYMENT_INSTRUCTIONS.md)** - Production deployment
- **[Infrastructure](./INFRASTRUCTURE.md)** - Infrastructure architecture
- **[Monitoring Integration](./MONITORING_INTEGRATION_EXAMPLES.md)** - Axiom setup
- **[Regression Prevention](./REGRESSION_PREVENTION.md)** - CI/CD and monitoring

### User Documentation

- **[User Features & Flows](./USER_FEATURES_AND_FLOWS.md)** - User-facing features
- **[Keyboard Shortcuts](./KEYBOARD_SHORTCUTS.md)** - Complete shortcut reference
- **[FAQ](./user-guide/FAQ.md)** - Frequently asked questions
- **[Onboarding](./user-guide/ONBOARDING.md)** - User onboarding guide

---

## API Documentation

### Main Documentation

- **[API Guide](./api/API_GUIDE.md)** - Complete API guide
- **[API Reference](./api/API_REFERENCE.md)** - All endpoints with examples
- **[Webhooks](./api/WEBHOOKS.md)** - Webhook integration

### Provider-Specific APIs

- **[Google AI APIs](./api/providers/google/)** - Imagen, Gemini, Veo
- **[ElevenLabs](./api/providers/elevenlabs/)** - Text-to-speech
- **[Fal.ai](./api/fal-ai-docs.md)** - Video generation
- **[Suno/Comet](./api/comet-suno-api-docs.md)** - Music generation
- **[Stripe](./api/stripe-api-docs.md)** - Payments
- **[Axiom](./api/axiom-api-docs.md)** - Logging

---

## Specialized Guides

### Performance & Optimization

- **[Memory Optimization](./MEMORY_OPTIMIZATION_GUIDE.md)** - Memory management
- **[Performance Budget](./PERFORMANCE_BUDGET.md)** - Performance targets
- **[Caching](./guides/CACHING.md)** - Caching strategies

### Development Tools

- **[Mock Patterns](./MOCK_PATTERNS_DOCUMENTATION.md)** - Testing mock patterns
- **[Middleware Patterns](./MIDDLEWARE_PATTERNS.md)** - Middleware implementation
- **[Loading Components](./LOADING_COMPONENTS.md)** - Loading state patterns
- **[Error Tracking](./guides/ERROR_TRACKING.md)** - Error monitoring

### Feature-Specific

- **[Easter Eggs](./EASTER_EGGS.md)** - Hidden features
- **[Onboarding Metrics](./ONBOARDING_METRICS.md)** - Onboarding analytics
- **[Accessibility](./ACCESSIBILITY.md)** - Accessibility implementation

---

## Setup Guides

### Services

- **[Environment Setup](./setup/ENVIRONMENT_SETUP.md)** - Complete environment configuration
- **[Supabase Setup](./SUPABASE_SETUP.md)** - Database and auth
- **[Supabase Auto-Deployment](./setup/SUPABASE_AUTO_DEPLOYMENT.md)** - GitHub Actions deployment
- **[Stripe Setup](./setup/STRIPE_SETUP.md)** - Payment integration
- **[Resend Setup](./setup/RESEND_SETUP.md)** - Email service
- **[Axiom Setup](./AXIOM_SETUP.md)** - Logging service

### Testing & CI/CD

- **[E2E CI/CD Setup](./E2E_CI_CD_SETUP.md)** - Automated testing
- **[Regression Prevention](./REGRESSION_PREVENTION.md)** - Test monitoring

---

## Project Status

### Current Status

- **[Project Status](./PROJECT_STATUS.md)** - Overall project health
- **[Issues](../ISSUES.md)** - Known issues and bugs

### Reports (Archive)

Historical reports are in `/archive/`. Recent important reports:

- **[Agent Validation Reports](./reports/)** - Quality assurance reports
- **[Service Coverage](./reports/)** - Test coverage reports

---

## Contributing

### Before You Start

1. Read [Coding Best Practices](./CODING_BEST_PRACTICES.md)
2. Set up your [Environment](./setup/ENVIRONMENT_SETUP.md)
3. Understand the [Architecture](./ARCHITECTURE_OVERVIEW.md)
4. Write [Tests](./TESTING_GUIDE.md) for new features

### Workflow

1. Create feature branch
2. Make changes following style guide
3. Write tests (coverage target: 70%+ for services)
4. Run `npm test` and `npm run build`
5. Commit with descriptive message
6. Push and create pull request

---

## Quick Links

**Most Frequently Used:**

- [Testing Guide](./TESTING_GUIDE.md)
- [API Reference](./api/API_REFERENCE.md)
- [Features](./FEATURES.md)
- [Coding Best Practices](./CODING_BEST_PRACTICES.md)

**Setup:**

- [Environment Setup](./setup/ENVIRONMENT_SETUP.md)
- [Supabase Setup](./SUPABASE_SETUP.md)

**Troubleshooting:**

- [Test Troubleshooting](./TEST_TROUBLESHOOTING.md)
- [Security Guide](./security/SECURITY_GUIDE.md)

---

**Need Help?**

- Check the relevant documentation above
- Search [Issues](../ISSUES.md) for known problems
- Create a new issue with details

---

**Documentation Version:** 2.0 (Consolidated)
**Last Updated:** 2025-10-25
