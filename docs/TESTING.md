# Testing Documentation

## Overview

This document provides comprehensive information about the testing infrastructure for the non-linear video editor project. Our test suite is built using Jest and React Testing Library, designed to ensure code quality and prevent regressions.

## Test Statistics

**Current Status (as of October 23, 2025):**

- **Total Tests:** 926 (2 skipped)
- **Passing:** 807
- **Failing:** 117
- **Pass Rate:** 87.3%
- **Test Suites:** 47 total (24 passing, 23 failing)

**Coverage:**

- Statements: 22.06% (2599/11779)
- Branches: 19.06% (1190/6241)
- Functions: 20.11% (384/1909)
- Lines: 22.67% (2495/11002)

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Specific Test File

```bash
npm test -- __tests__/components/LoadingSpinner.test.tsx
```

### Run Tests by Pattern

```bash
npm test -- --testNamePattern="should render"
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Tests by Category

```bash
# Component tests
npm test __tests__/components/

# API route tests
npm test __tests__/api/

# Service tests
npm test __tests__/services/

# Library/utility tests
npm test __tests__/lib/

# Hook tests
npm test __tests__/hooks/
```

## Test Structure

### Directory Organization

```
__tests__/
├── api/                    # API route tests
│   ├── assets/             # Asset management endpoints
│   ├── audio/              # Audio generation endpoints
│   ├── export/             # Video export endpoints
│   ├── image/              # Image generation endpoints
│   ├── payments/           # Payment and subscription endpoints
│   ├── projects/           # Project management endpoints
│   ├── video/              # Video generation endpoints
│   └── admin/              # Admin endpoints
├── components/             # React component tests
│   ├── editor/             # Editor-specific components
│   ├── generation/         # Video generation components
│   └── ui/                 # Shared UI components
├── helpers/                # Test helper utilities
│   ├── api.ts              # API testing helpers
│   ├── components.tsx      # Component testing helpers
│   ├── mocks.ts            # Mock data and functions
│   ├── supabase.ts         # Supabase mock helpers
│   └── index.ts            # Shared test utilities
├── lib/                    # Library/utility tests
│   ├── api/                # API utilities
│   ├── hooks/              # Custom React hooks
│   └── utils/              # General utilities
├── services/               # Service layer tests
└── state/                  # State management tests
```

## Test Helper Utilities

### API Testing Helpers (\`**tests**/helpers/api.ts\`)

**createAuthenticatedRequest(userId, options)**

- Creates a mock NextRequest with authentication headers
- Used for testing authenticated API routes

**createMockResponse(data, status, headers)**

- Creates a mock Response object with JSON data
- Used for mocking API responses

**expectSuccessResponse(response, expectedData)**

- Asserts that a response is successful (2xx status)
- Optionally matches expected data structure

**expectErrorResponse(response, expectedStatus, expectedError)**

- Asserts that a response is an error with expected status
- Optionally matches error message

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass before creating a PR
3. Maintain or improve code coverage
4. Follow the existing test patterns
5. Document complex test scenarios
