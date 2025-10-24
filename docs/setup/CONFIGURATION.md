# Configuration Guide

This document provides a comprehensive overview of the project's configuration files and development tooling.

## Table of Contents

- [Overview](#overview)
- [Configuration Files](#configuration-files)
- [Scripts Reference](#scripts-reference)
- [CI/CD Workflows](#cicd-workflows)
- [Development Tools](#development-tools)
- [Environment Setup](#environment-setup)
- [Docker Support](#docker-support)

## Overview

This project uses modern configuration and tooling best practices:

- **TypeScript** with strict mode enabled
- **Next.js 15** with Turbopack for fast builds
- **ESLint & Prettier** for code quality
- **Husky & lint-staged** for pre-commit hooks
- **Jest & Playwright** for testing
- **GitHub Actions** for CI/CD
- **Docker** for containerization

## Configuration Files

### Core Configuration

#### `package.json`

Defines project dependencies, scripts, and configurations:

- **Node version**: 18.18.0 - 22.x (specified in `engines`)
- **Scripts**: See [Scripts Reference](#scripts-reference)
- **Lint-staged**: Automatic formatting and linting on commit

#### `tsconfig.json`

TypeScript configuration with strict mode:

- Strict type checking enabled
- ES2022 target
- Path aliases: `@/*` maps to project root
- Excludes test files from compilation

#### `next.config.ts`

Next.js configuration with production optimizations:

- **Security headers**: CSP, XSS protection, frame options
- **Image optimization**: AVIF/WebP formats, Supabase CDN support
- **Bundle analyzer**: Enable with `ANALYZE=true npm run build`
- **Production optimizations**: Console removal, compression, standalone output

### Code Quality

#### `eslint.config.mjs`

ESLint configuration using flat config:

- Extends Next.js core web vitals and TypeScript rules
- Ignores build outputs, test files, and scripts
- Custom rules for test files

#### `.prettierrc`

Code formatting rules:

- Semi-colons: Yes
- Single quotes: Yes
- Print width: 100
- Tab width: 2 spaces
- Trailing commas: ES5

#### `.editorconfig`

Editor configuration for consistency:

- UTF-8 encoding
- LF line endings
- 2 space indentation
- Trim trailing whitespace

### Testing

#### `jest.config.js`

Jest configuration for unit tests:

- Uses Next.js Jest preset
- jsdom environment for React testing
- Coverage collection from app, components, lib, state
- Path alias support

#### `playwright.config.ts`

E2E testing configuration:

- Multiple browser support (Chromium, Firefox, WebKit)
- Mobile device testing (iPhone, iPad, Android)
- Custom viewport sizes (1080p, 4K, mobile)
- Video and screenshot on failure
- Automatic dev server startup

### Git Hooks

#### `.husky/pre-commit`

Pre-commit hook:

1. Runs lint-staged (Prettier + ESLint)
2. Runs TypeScript type checking (warning only)

### Docker

#### `Dockerfile`

Multi-stage production build:

1. **deps**: Install dependencies
2. **builder**: Build Next.js app
3. **runner**: Minimal production image with non-root user

Features:

- Alpine Linux base (small image size)
- Non-root user for security
- Health check endpoint
- Standalone output for optimal size

#### `Dockerfile.dev`

Development Dockerfile with hot-reload support.

#### `docker-compose.yml`

Docker Compose configuration for both development and production:

- `app-dev`: Development server with volume mounts
- `app-prod`: Production build

### IDE Configuration

#### `.vscode/settings.json`

VSCode workspace settings:

- Format on save with Prettier
- ESLint auto-fix
- TypeScript workspace version
- Tailwind CSS support
- Search exclusions

#### `.vscode/extensions.json`

Recommended extensions:

- Prettier
- ESLint
- Tailwind CSS IntelliSense
- Playwright
- Jest
- Docker
- EditorConfig

## Scripts Reference

### Development

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Build with bundle analysis
npm run build:analyze

# Start production server
npm start
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without modifying
npm run format:check

# Run TypeScript type checking
npm run type-check

# Run all validation checks
npm run validate
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run all tests (unit + E2E)
npm run test:all
```

### Environment & Validation

```bash
# Validate environment variables
npm run validate:env

# Check environment configuration
npm run check:env

# Analyze bundle size
npm run analyze:bundle
```

### Maintenance

```bash
# Clean build artifacts
npm run clean

# Clean dependencies and reinstall
npm run clean:deps
```

## CI/CD Workflows

### Main Workflows

#### `ci.yml` - Continuous Integration

Runs on push/PR to main and develop branches:

1. **Lint & Format**: ESLint and Prettier checks
2. **Type Check**: TypeScript compilation
3. **Unit Tests**: Jest with coverage
4. **Build Check**: Verify production build
5. **Security Audit**: npm audit
6. **Dependency Review**: Check for vulnerable dependencies (PRs only)
7. **Environment Validation**: Validate env setup

#### `e2e-tests.yml` - End-to-End Testing

Runs on push/PR to main and develop branches:

- Tests across Chromium, Firefox, and WebKit
- Mobile testing (iPhone, iPad variants)
- Uploads test reports and videos

#### `code-quality.yml` - Code Quality Analysis

Runs on pull requests:

1. **Bundle Analysis**: Check bundle size
2. **Complexity Check**: Identify large files and deep nesting
3. **Lighthouse CI**: Performance audits
4. **Coverage Check**: Test coverage thresholds

#### `deploy.yml` - Production Deployment

Runs on push to main branch:

- Runs all CI checks first
- Builds for production
- Deploys to Vercel (configure as needed)
- Post-deployment health check

#### `dependency-update.yml` - Dependency Management

Runs weekly on Monday at 9 AM UTC:

- Checks for outdated packages
- Runs security audit
- Can auto-update patch versions (manual trigger)

### Workflow Features

- **Concurrency control**: Prevents duplicate runs
- **Artifact uploads**: Test reports, coverage, screenshots
- **Caching**: npm dependencies cached for faster runs
- **Matrix testing**: Multiple browsers and devices
- **Security scanning**: Automated vulnerability detection

## Development Tools

### Bundle Analysis

```bash
# Build with bundle analyzer
npm run build:analyze

# Check bundle size after build
npm run analyze:bundle
```

The bundle analyzer:

- Opens interactive visualization in browser
- Shows largest modules and chunks
- Identifies optimization opportunities

### Type Checking

```bash
# Check types without building
npm run type-check
```

TypeScript is configured with strict mode:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

### Pre-commit Hooks

Husky runs automatically on `git commit`:

1. Formats staged files with Prettier
2. Lints staged files with ESLint
3. Type checks the entire project (warning only)

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

## Environment Setup

### Quick Start

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Edit .env.local with your values
# See .env.example for all available variables

# 3. Validate configuration
npm run check:env

# 4. Start development
npm run dev
```

### Required Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Recommended Variables

- `NEXT_PUBLIC_BASE_URL`
- `STRIPE_PREMIUM_PRICE_ID`
- `GOOGLE_SERVICE_ACCOUNT` or `AISTUDIO_API_KEY`
- `AXIOM_TOKEN` (for logging)

See `.env.example` for complete documentation.

## Docker Support

### Development

```bash
# Using docker-compose
docker-compose up app-dev

# Manual build and run
docker build -f Dockerfile.dev -t myapp:dev .
docker run -p 3000:3000 -v $(pwd):/app myapp:dev
```

### Production

```bash
# Using docker-compose
docker-compose up app-prod

# Manual build and run
docker build -t myapp:prod .
docker run -p 3000:3000 myapp:prod
```

### Health Check

The production Docker image includes a health check:

```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:3000/api/health
```

## Best Practices

### Before Committing

```bash
# Run validation
npm run validate

# Run tests
npm test

# Check bundle size (after changes to dependencies)
npm run analyze:bundle
```

### Before Deploying

```bash
# Ensure all tests pass
npm run test:all

# Build successfully
npm run build

# Check bundle size
npm run analyze:bundle

# Validate environment
npm run validate:env
```

### Code Quality Guidelines

1. **TypeScript**: Use strict types, avoid `any`
2. **Components**: Keep files under 500 lines
3. **Testing**: Write tests for new features
4. **Performance**: Monitor bundle size
5. **Security**: Never commit secrets
6. **Documentation**: Update docs when adding features

## Troubleshooting

### Build Failures

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Type Errors

```bash
# Run type check to see all errors
npm run type-check
```

### Test Failures

```bash
# Run tests with verbose output
npm test -- --verbose

# Debug E2E tests
npm run test:e2e:debug
```

### Environment Issues

```bash
# Validate environment setup
npm run check:env
npm run validate:env
```

## Additional Resources

- [Environment Variables Guide](.env.example)
- [TypeScript Configuration](tsconfig.json)
- [Next.js Documentation](https://nextjs.org/docs)
- [Playwright Documentation](https://playwright.dev)
- [Jest Documentation](https://jestjs.io)
