# Test Templates

This directory contains templates for common test types in the project.

## Available Templates

1. **api-route.template.test.ts** - Template for testing Next.js API routes
2. **component.template.test.tsx** - Template for testing React components
3. **integration.template.test.ts** - Template for integration tests
4. **service.template.test.ts** - Template for testing service layer classes
5. **hook.template.test.tsx** - Template for testing custom React hooks

## How to Use

### Step 1: Copy Template

Copy the appropriate template to your test directory:

```bash
# API Route test
cp test-utils/templates/api-route.template.test.ts __tests__/api/my-route.test.ts

# Component test
cp test-utils/templates/component.template.test.tsx __tests__/components/MyComponent.test.tsx

# Integration test
cp test-utils/templates/integration.template.test.ts __tests__/integration/my-workflow.test.ts

# Service test
cp test-utils/templates/service.template.test.ts __tests__/services/myService.test.ts

# Hook test
cp test-utils/templates/hook.template.test.tsx __tests__/hooks/useMyHook.test.tsx
```

### Step 2: Customize Template

1. Replace all `TODO` comments with your actual test logic
2. Update the test description at the top
3. Import your actual components/services/hooks
4. Add specific assertions for your use case

### Step 3: Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- my-route.test.ts

# Run in watch mode
npm test -- --watch
```

## Template Features

Each template includes:

- **Boilerplate setup** - beforeEach/afterEach with mock setup and cleanup
- **Common test cases** - Typical scenarios for each test type
- **TODO markers** - Clear indicators of what needs to be customized
- **Examples** - Commented examples showing how to use test utilities
- **Best practices** - Following AAA pattern (Arrange-Act-Assert)
- **TypeScript types** - Properly typed for IntelliSense support

## Tips

1. **Don't skip TODOs** - Each TODO represents critical customization needed
2. **Remove unused tests** - Delete test cases that don't apply to your component/service
3. **Add more tests** - Templates provide baseline coverage; add more specific tests
4. **Follow naming conventions** - Keep test file names consistent with source files
5. **Use descriptive test names** - Test names should clearly describe what's being tested

## Getting Help

- See `/docs/TESTING_UTILITIES.md` for comprehensive testing documentation
- Check existing tests for real-world examples
- Ask in team chat if you need help

## Contributing

When adding new templates:

1. Follow the existing template structure
2. Include comprehensive TODO markers
3. Add examples in comments
4. Update this README
5. Test the template by using it yourself
