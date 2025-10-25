# API Route Tests

This directory contains comprehensive test coverage for critical API routes in the application.

## Test Structure

```
__tests__/api/
├── projects/
│   └── create.test.ts       # Project creation tests
├── payments/
│   ├── checkout.test.ts     # Stripe checkout session tests
│   └── webhook.test.ts      # Stripe webhook handler tests
├── video/
│   ├── generate.test.ts     # Video generation tests (Veo & FAL)
│   └── status.test.ts       # Video generation status check tests
└── assets/
    ├── upload.test.ts       # Asset upload tests
    └── sign.test.ts         # Signed URL generation tests
```

## Running Tests

```bash
# Run all API tests
npm test -- __tests__/api

# Run specific test file
npm test -- __tests__/api/projects/create.test.ts

# Run with coverage
npm test -- __tests__/api --coverage

# Watch mode
npm test -- __tests__/api --watch
```

## Test Coverage

### Priority 1 - Projects (Highest Priority)

- **create.test.ts** - POST /api/projects
  - Authentication tests
  - Input validation
  - Success cases (custom title, default title)
  - Database error handling
  - Response format validation

### Priority 2 - Payments

- **checkout.test.ts** - POST /api/stripe/checkout
  - Authentication tests
  - User profile validation
  - Stripe customer creation
  - Checkout session creation
  - Custom price handling
  - URL configuration
  - Error scenarios

- **webhook.test.ts** - POST /api/stripe/webhook
  - Webhook signature verification
  - checkout.session.completed events
  - customer.subscription.updated events
  - customer.subscription.deleted events
  - Admin tier preservation
  - Error handling & retry logic
  - Database failure scenarios

### Priority 3 - Video Generation

- **generate.test.ts** - POST /api/video/generate
  - Authentication tests
  - Rate limiting (5 req/min)
  - Input validation (prompt, projectId, etc.)
  - Project ownership verification
  - Google Veo integration
  - FAL.ai integration (Seedance, MiniMax)
  - Image-to-video generation
  - Error handling

- **status.test.ts** - GET /api/video/status
  - Authentication tests
  - Input validation
  - FAL operation status checking
  - Veo operation status checking
  - Video download (base64 & GCS)
  - Storage upload & asset creation
  - Activity history logging
  - Cleanup on errors

### Priority 4 - Assets

- **upload.test.ts** - POST /api/assets/upload
  - Authentication tests
  - File validation (size, MIME type)
  - Project authorization
  - Storage upload
  - Asset record creation
  - Activity history logging
  - Cleanup on failures
  - Supported formats: images, videos, audio

- **sign.test.ts** - GET /api/assets/sign
  - Authentication tests
  - Input validation
  - Asset lookup by assetId
  - Authorization by storageUrl
  - Signed URL generation
  - Custom TTL support
  - Storage bucket handling
  - Error handling

## Test Patterns

### Authentication Testing

All tests verify:

- 401 response for unauthenticated requests
- 401 response for invalid tokens
- Proper user context in authenticated requests

### Validation Testing

All tests verify:

- 400 response for missing required fields
- 400 response for invalid data types
- 400 response for out-of-range values
- Proper error messages with field names

### Authorization Testing

All tests verify:

- 403 response for unauthorized access
- 404 response for non-existent resources
- Proper ownership verification

### Error Handling

All tests verify:

- 500 response for database errors
- 500 response for external API failures
- Proper error cleanup (e.g., removing uploaded files)
- Informative error messages

### Success Cases

All tests verify:

- Correct HTTP status codes
- Complete response objects
- Database record creation
- External API integration
- Activity logging

## Mocking Utilities

Located in `__tests__/utils/`:

### mockSupabase.ts

Provides utilities for mocking Supabase client:

- `createMockSupabaseClient()` - Creates chainable mock client
- `createMockUser()` - Creates mock user object
- `createMockProject()` - Creates mock project
- `createMockAsset()` - Creates mock asset
- `createMockUserProfile()` - Creates mock user profile
- `mockAuthenticatedUser()` - Sets up authenticated state
- `mockUnauthenticatedUser()` - Sets up unauthenticated state
- `mockQuerySuccess()` - Mocks successful query
- `mockQueryError()` - Mocks failed query
- `mockStorageUploadSuccess()` - Mocks successful upload
- `mockStorageUploadError()` - Mocks failed upload

### mockStripe.ts

Provides utilities for mocking Stripe:

- `createMockCheckoutSession()` - Creates mock checkout session
- `createMockSubscription()` - Creates mock subscription
- `createMockCustomer()` - Creates mock customer
- `createMockWebhookEvent()` - Creates mock webhook event
- `createMockStripeClient()` - Creates mock Stripe client

## Test Coverage Goals

Current test files: **9 test suites**
Target coverage for critical routes: **60%+**

Coverage breakdown:

- Projects: High coverage on creation
- Payments: Comprehensive webhook & checkout coverage
- Video: Full generation & status flow coverage
- Assets: Complete upload & signing coverage

## Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Cleanup**: Use `beforeEach` and `afterEach` to reset mocks
3. **Descriptive Names**: Test names clearly describe what they verify
4. **Comprehensive**: Tests cover success, failure, and edge cases
5. **Mock External APIs**: All external services are mocked
6. **Real Logic**: Business logic is tested without mocks

## Common Issues

### Request/Response Not Defined

If you see "Request is not defined", ensure jest.setup.js includes Web API polyfills.

### Module Mocking

Mocks must be defined before the module is imported. Use `jest.mock()` at the top of test files.

### Async/Await

Always use `async/await` when testing async functions and API routes.

### Type Errors

Use `as any` sparingly and prefer proper TypeScript types with `jest.Mocked<T>`.

## Future Enhancements

1. Add tests for remaining API routes:
   - GET /api/projects (list projects)
   - DELETE /api/projects (delete project)
   - POST /api/export (export video)
   - GET /api/history (activity history)
   - POST /api/ai/chat (AI chat)

2. Add integration tests with real database
3. Add E2E tests for complete user flows
4. Improve test data factories
5. Add performance benchmarks
6. Add load testing for rate limits

## Contributing

When adding new API routes:

1. Create corresponding test file in appropriate directory
2. Follow existing test patterns
3. Achieve minimum 60% coverage
4. Include all test categories (auth, validation, errors, success)
5. Update this README with new test information
