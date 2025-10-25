# Testing Standards Checklist

## Test Organization

### File Structure
- [ ] Test files colocated with source or in `__tests__/`
- [ ] Test file naming: `ComponentName.test.tsx` or `functionName.test.ts`
- [ ] Test helpers in `__tests__/helpers/`
- [ ] Test fixtures in `__tests__/fixtures/`
- [ ] Integration tests in `__tests__/integration/`

### Test Grouping
- [ ] Related tests grouped with `describe` blocks
- [ ] Clear describe block names (component/feature name)
- [ ] Nested describes for sub-features
- [ ] Tests ordered logically (happy path first, then edge cases)

## Test Quality

### AAA Pattern
- [ ] **Arrange**: Setup data and mocks
- [ ] **Act**: Execute the code under test
- [ ] **Assert**: Verify the expected outcome
- [ ] Clear separation between phases
- [ ] Each phase properly commented if complex

### Test Naming
- [ ] Descriptive test names: "should X when Y"
- [ ] Test names read like requirements
- [ ] Avoid technical jargon in test names
- [ ] Test names indicate expected behavior
- [ ] Examples:
  - ✅ "should display error message when email is invalid"
  - ❌ "test email validation"

### Test Independence
- [ ] Tests don't depend on execution order
- [ ] Each test cleans up after itself
- [ ] Shared setup in `beforeEach`, not in global scope
- [ ] No shared mutable state between tests
- [ ] Database/state reset between tests

### Test Coverage
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested (empty, null, max, min)
- [ ] Boundary conditions tested
- [ ] Integration points tested

## React Component Testing

### Rendering Tests
- [ ] Component renders without crashing
- [ ] Required props passed
- [ ] Conditional rendering tested
- [ ] Default props tested
- [ ] Children rendered correctly

### Interaction Tests
- [ ] Button clicks handled
- [ ] Form submissions tested
- [ ] Input changes tested
- [ ] Keyboard interactions tested
- [ ] Focus management tested

### State Tests
- [ ] State changes reflected in UI
- [ ] Store updates trigger re-renders
- [ ] Async state updates handled
- [ ] Loading states tested
- [ ] Error states tested

### Using React Testing Library
- [ ] Use semantic queries (getByRole, getByLabelText)
- [ ] Avoid `getByTestId` unless necessary
- [ ] Use `waitFor` for async operations
- [ ] Use `userEvent` for interactions (not fireEvent)
- [ ] Cleanup handled automatically

## API Route Testing

### Request Testing
- [ ] Valid requests succeed
- [ ] Invalid requests rejected (400)
- [ ] Missing required fields rejected
- [ ] Type validation tested
- [ ] Malformed JSON handled

### Authentication Testing
- [ ] Authenticated requests succeed
- [ ] Unauthenticated requests fail (401)
- [ ] Unauthorized requests fail (403)
- [ ] Token validation tested
- [ ] Ownership verification tested

### Response Testing
- [ ] Correct status codes returned
- [ ] Response body matches expected shape
- [ ] Error responses include message
- [ ] Success responses include data
- [ ] Headers set correctly

### Database Testing
- [ ] Mocked database calls
- [ ] Database errors handled
- [ ] Transactions tested
- [ ] RLS policies respected
- [ ] Cleanup in afterEach

## Integration Testing

### User Flows
- [ ] Critical user journeys tested end-to-end
- [ ] Multi-step processes tested
- [ ] Navigation between pages tested
- [ ] Form submission flows tested
- [ ] Error recovery flows tested

### External Services
- [ ] Supabase calls mocked in unit tests
- [ ] Integration tests use test database
- [ ] File uploads tested
- [ ] Video processing mocked
- [ ] Third-party APIs mocked

### Async Operations
- [ ] Promises resolved in tests
- [ ] Race conditions tested
- [ ] Timeouts handled
- [ ] Cancellation tested
- [ ] Retries tested

## Test Helpers & Utilities

### Helper Functions
- [ ] Common setup in `__tests__/helpers/`
- [ ] Test data factories for common objects
- [ ] Mock creators for stores
- [ ] Render helpers for components with providers
- [ ] Assertion helpers for common checks

### Test Reliability
- [ ] No flaky tests (see TEST_RELIABILITY_GUIDE.md)
- [ ] Timeouts appropriate for async operations
- [ ] No hardcoded delays (use `waitFor`)
- [ ] Race conditions eliminated
- [ ] Proper cleanup to prevent test pollution

### Mocking Best Practices
- [ ] Mock at appropriate level (not over-mocking)
- [ ] Restore mocks in `afterEach`
- [ ] Mock implementations are realistic
- [ ] Mock data represents real-world scenarios
- [ ] Verify mock calls when important

## Performance Testing

### Test Performance
- [ ] Tests run quickly (<100ms per test when possible)
- [ ] Slow tests marked with comment
- [ ] No unnecessary waits
- [ ] Database queries mocked in unit tests
- [ ] Heavy setup moved to beforeAll when safe

### Coverage Metrics
- [ ] Aim for >80% coverage on critical paths
- [ ] 100% coverage on utilities
- [ ] Business logic well-tested
- [ ] Error handling tested
- [ ] Don't chase 100% for the sake of it

## Project-Specific Testing

### Timeline Tests
- [ ] Clip rendering tested
- [ ] Drag and drop tested
- [ ] Zoom functionality tested
- [ ] Playback synchronization tested
- [ ] Collision detection tested
- [ ] See: `__tests__/integration/timeline-playback-sync.test.ts`

### Asset Management Tests
- [ ] Upload flow tested
- [ ] Storage integration tested
- [ ] Asset deletion tested
- [ ] Thumbnail generation mocked
- [ ] See: `__tests__/integration/asset-storage-flow.test.ts`

### Export Tests
- [ ] Export queue lifecycle tested
- [ ] Job status transitions tested
- [ ] Error handling tested
- [ ] Webhook notifications tested
- [ ] See: `__tests__/integration/export-queue-lifecycle.test.ts`

### Boundary Conditions
- [ ] Empty states tested
- [ ] Maximum values tested
- [ ] Null/undefined handled
- [ ] Concurrent operations tested
- [ ] See: `__tests__/integration/boundary-conditions.test.ts`

## Continuous Integration

### CI Configuration
- [ ] Tests run on every PR
- [ ] Tests must pass to merge
- [ ] Coverage reports generated
- [ ] Flaky tests identified
- [ ] Test failures investigated promptly

### Test Reliability in CI
- [ ] No random test failures
- [ ] Tests pass consistently
- [ ] Proper cleanup to avoid pollution
- [ ] Timeouts account for slow CI environment
- [ ] Race conditions eliminated

## Documentation

### Test Documentation
- [ ] Complex test setup explained with comments
- [ ] Unusual mocking strategies documented
- [ ] Known limitations noted
- [ ] Test helpers documented (JSDoc)
- [ ] Integration test flows diagrammed if complex

### Skipped Tests
- [ ] Skipped tests have reason comment
- [ ] Skipped tests have ticket/issue number
- [ ] Skipped tests regularly reviewed
- [ ] `.skip` only temporary
- [ ] `.only` never committed

## Error Testing

### Error Scenarios
- [ ] Network errors tested
- [ ] Database errors tested
- [ ] Validation errors tested
- [ ] Unexpected errors caught
- [ ] Error boundaries tested

### Error Messages
- [ ] Error messages displayed correctly
- [ ] Error messages are user-friendly
- [ ] Technical errors logged
- [ ] Error states recoverable
- [ ] Error tracking verified (trackError called)

## Maintenance

### Test Maintenance
- [ ] Tests updated when behavior changes
- [ ] Obsolete tests removed
- [ ] Flaky tests fixed or removed
- [ ] Test helpers kept DRY
- [ ] Dead code removed from tests

### Refactoring Tests
- [ ] Tests refactored with code
- [ ] Test duplication eliminated
- [ ] Test helpers created for common patterns
- [ ] Test readability prioritized
- [ ] Tests serve as documentation
