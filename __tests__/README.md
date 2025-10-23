# Testing Documentation

This directory contains all tests for the Next.js video editor application. The project uses Jest and React Testing Library for comprehensive testing coverage.

## Table of Contents

- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Mocking](#mocking)
- [Coverage](#coverage)
- [Best Practices](#best-practices)

## Getting Started

All testing dependencies are included in `package.json`. To install:

```bash
npm install
```

## Running Tests

### Run all tests once

```bash
npm test
```

### Run tests in watch mode (re-runs on file changes)

```bash
npm run test:watch
```

### Run tests with coverage report

```bash
npm run test:coverage
```

### Run specific test file

```bash
npm test password-validation
```

### Run tests matching a pattern

```bash
npm test -- --testNamePattern="should validate"
```

## Test Structure

Tests are organized in the `__tests__` directory, mirroring the project structure:

```
__tests__/
├── components/        # Component tests
│   └── ErrorBoundary.test.tsx
├── lib/              # Utility/library tests
│   ├── password-validation.test.ts
│   ├── fetchWithTimeout.test.ts
│   └── rateLimit.test.ts
├── state/            # State management tests
│   └── useEditorStore.test.ts
└── README.md         # This file
```

## Writing Tests

### Basic Test Structure

```typescript
import { functionToTest } from '@/lib/yourModule'

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should perform expected behavior', () => {
      const result = functionToTest(input)
      expect(result).toBe(expectedOutput)
    })
  })
})
```

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YourComponent } from '@/components/YourComponent'

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const user = userEvent.setup()
    render(<YourComponent />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(screen.getByText('Updated Text')).toBeInTheDocument()
  })
})
```

### Testing Zustand Stores

```typescript
import { renderHook, act } from '@testing-library/react'
import { useYourStore } from '@/state/useYourStore'

describe('useYourStore', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useYourStore())

    act(() => {
      result.current.updateValue('new value')
    })

    expect(result.current.value).toBe('new value')
  })
})
```

### Testing Async Functions

```typescript
it('should fetch data successfully', async () => {
  const data = await fetchData()
  expect(data).toEqual(expectedData)
})
```

### Testing Error Cases

```typescript
it('should throw error for invalid input', () => {
  expect(() => functionThatThrows()).toThrow('Expected error message')
})

it('should handle async errors', async () => {
  await expect(asyncFunctionThatThrows()).rejects.toThrow('Error message')
})
```

## Mocking

### Available Mocks

The project includes pre-configured mocks in the `__mocks__` directory:

#### Supabase Mock (`__mocks__/supabase.ts`)

```typescript
import { mockSupabaseClient } from '@/__mocks__/supabase'

// Use in tests
jest.mock('@/lib/supabase', () => require('@/__mocks__/supabase'))
```

#### Next.js Navigation Mock (`__mocks__/next-navigation.ts`)

```typescript
jest.mock('next/navigation', () => require('@/__mocks__/next-navigation'))

// Access mocked functions
import { useRouter } from 'next/navigation'
const mockPush = useRouter().push
expect(mockPush).toHaveBeenCalledWith('/expected-route')
```

### Creating Custom Mocks

#### Mock a Module

```typescript
jest.mock('@/lib/yourModule', () => ({
  functionName: jest.fn().mockReturnValue('mocked value'),
}))
```

#### Mock fetch

```typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
})
```

#### Mock timers

```typescript
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

test('uses fake timers', () => {
  const callback = jest.fn()
  setTimeout(callback, 1000)

  jest.advanceTimersByTime(1000)
  expect(callback).toHaveBeenCalled()
})
```

## Coverage

Coverage reports are generated with:

```bash
npm run test:coverage
```

### Coverage Configuration

The Jest configuration collects coverage from:
- `app/**/*.{js,jsx,ts,tsx}`
- `components/**/*.{js,jsx,ts,tsx}`
- `lib/**/*.{js,jsx,ts,tsx}`
- `state/**/*.{js,jsx,ts,tsx}`

Excluded from coverage:
- Type definition files (`*.d.ts`)
- Node modules
- Build output (`.next/`)
- Test files themselves

### Viewing Coverage

After running with `--coverage`, open:
```
coverage/lcov-report/index.html
```

### Coverage Goals

- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

## Best Practices

### 1. Test Naming

- Use descriptive test names that explain the expected behavior
- Follow the pattern: `should [expected behavior] when [condition]`

```typescript
// Good
it('should return error when password is too short', () => {})

// Bad
it('test password', () => {})
```

### 2. Arrange-Act-Assert (AAA) Pattern

```typescript
it('should add clip to timeline', () => {
  // Arrange - Set up test data
  const timeline = createMockTimeline()
  const clip = createMockClip()

  // Act - Perform the action
  addClipToTimeline(timeline, clip)

  // Assert - Verify the result
  expect(timeline.clips).toContain(clip)
})
```

### 3. Test One Thing at a Time

Each test should verify a single behavior or outcome.

```typescript
// Good - Separate tests
it('should validate password length', () => {})
it('should validate password complexity', () => {})

// Bad - Testing multiple things
it('should validate password', () => {
  // Tests length, complexity, special chars, etc.
})
```

### 4. Use beforeEach for Setup

```typescript
describe('MyComponent', () => {
  let mockData

  beforeEach(() => {
    mockData = createMockData()
    jest.clearAllMocks()
  })

  it('test 1', () => {
    // Use mockData
  })
})
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
})
```

### 6. Test Edge Cases

- Empty inputs
- Null/undefined values
- Boundary values (min/max)
- Error conditions
- Race conditions for async code

### 7. Avoid Implementation Details

Test behavior, not implementation:

```typescript
// Good - Tests behavior
expect(screen.getByText('Welcome')).toBeInTheDocument()

// Bad - Tests implementation
expect(component.state.isVisible).toBe(true)
```

### 8. Use Data-Testid Sparingly

Prefer semantic queries:

```typescript
// Best
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email')

// Good
screen.getByText('Welcome')

// Use only when necessary
screen.getByTestId('custom-element')
```

### 9. Test Accessibility

```typescript
it('should be accessible', () => {
  const { container } = render(<YourComponent />)
  expect(container.querySelector('button')).toHaveAttribute('aria-label')
})
```

### 10. Keep Tests Fast

- Mock external dependencies (APIs, databases)
- Avoid unnecessary delays
- Use fake timers for time-based tests

## Common Testing Patterns

### Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const user = userEvent.setup()
  const onSubmit = jest.fn()

  render(<Form onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.type(screen.getByLabelText('Password'), 'Password123!')
  await user.click(screen.getByRole('button', { name: 'Submit' }))

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'Password123!',
  })
})
```

### Testing Loading States

```typescript
it('should show loading spinner', () => {
  render(<Component isLoading={true} />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})
```

### Testing Error States

```typescript
it('should display error message', () => {
  render(<Component error="Something went wrong" />)
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
})
```

## Troubleshooting

### Tests timing out

Increase timeout in test:
```typescript
it('slow test', async () => {
  // test code
}, 10000) // 10 second timeout
```

### Module not found errors

Check your path aliases in `jest.config.js`:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### Act warnings

Wrap state updates in `act()`:
```typescript
await act(async () => {
  result.current.updateState()
})
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Getting Help

If you encounter issues:
1. Check this documentation
2. Review existing test files for examples
3. Consult the official documentation links above
4. Ask the team in your communication channel
