# Style Guide

> **Comprehensive code style and formatting conventions for consistent, maintainable code.**

**Last Updated:** October 24, 2025 (Updated with test writing best practices by Agent 30)

---

## Table of Contents

1. [Code Formatting](#code-formatting)
2. [Naming Conventions](#naming-conventions)
3. [TypeScript Style](#typescript-style)
4. [React Component Style](#react-component-style)
5. [Import Organization](#import-organization)
6. [Comment Style](#comment-style)
7. [File Organization](#file-organization)
8. [Git Commit Style](#git-commit-style)

---

## Code Formatting

### Automated Formatting

We use **Prettier** for automated code formatting. Configuration is enforced via `.prettierrc`.

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "bracketSameLine": false
}
```

### Key Formatting Rules

**Line Length:**

- Maximum 100 characters per line
- Break long lines at logical points
- Use multi-line formatting for complex expressions

```typescript
// ✅ Good
const result = someFunction(firstArgument, secondArgument, thirdArgument, fourthArgument);

// ❌ Bad - too long
const result = someFunction(
  firstArgument,
  secondArgument,
  thirdArgument,
  fourthArgument,
  fifthArgument
);
```

**Semicolons:**

- Always use semicolons

```typescript
// ✅ Good
const name = 'John';
console.log(name);

// ❌ Bad
const name = 'John';
console.log(name);
```

**Quotes:**

- Single quotes for TypeScript/JavaScript
- Double quotes for JSX attributes
- Template literals for string interpolation

```typescript
// ✅ Good
const name = 'John';
const greeting = `Hello, ${name}`;
const component = <Button label="Click me" />;

// ❌ Bad
const name = "John";
const greeting = 'Hello, ' + name;
const component = <Button label='Click me' />;
```

**Trailing Commas:**

- ES5 style (trailing commas in arrays and objects)

```typescript
// ✅ Good
const obj = {
  name: 'John',
  age: 30,
};

const arr = ['item1', 'item2', 'item3'];

// ❌ Bad
const obj = {
  name: 'John',
  age: 30,
};
```

**Arrow Functions:**

- Always use parentheses around parameters

```typescript
// ✅ Good
const square = (x) => x * x;
const greet = (name) => `Hello, ${name}`;

// ❌ Bad
const square = (x) => x * x;
```

---

## Naming Conventions

### Files and Directories

**TypeScript Files:**

- camelCase for utilities: `arrayUtils.ts`, `timelineUtils.ts`
- PascalCase for components: `Button.tsx`, `TimelineView.tsx`
- camelCase for services: `projectService.ts`, `authService.ts`
- camelCase for hooks: `useDebounce.ts`, `useAutosave.ts`

```
✅ Good structure:
lib/
  utils/
    arrayUtils.ts
    timelineUtils.ts
  services/
    projectService.ts
    userService.ts
  hooks/
    useDebounce.ts

components/
  ui/
    Button.tsx
    Dialog.tsx
  editor/
    TimelineView.tsx
```

**Test Files:**

- Match source file name with `.test` suffix
- `Button.test.tsx` for `Button.tsx`
- `projectService.test.ts` for `projectService.ts`

**Directories:**

- kebab-case for URL-based routes: `/app/video-gen/page.tsx`
- camelCase for code directories: `/lib/hooks/`, `/state/`

### Variables and Functions

**Variables:**

```typescript
// ✅ Good - camelCase for variables
const userName = 'John';
const isActive = true;
const maxRetries = 3;

// ❌ Bad
const UserName = 'John';
const is_active = true;
const MAX_RETRIES = 3; // Use for constants only
```

**Functions:**

```typescript
// ✅ Good - camelCase, descriptive names
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function getUserById(id: string): User | null {
  return users.find((user) => user.id === id) ?? null;
}

// ❌ Bad - unclear names
function calc(i: Item[]): number {} // Too short
function get(id: string) {} // Ambiguous
```

**Boolean Variables:**

- Prefix with `is`, `has`, `should`, `can`

```typescript
// ✅ Good
const isLoading = true;
const hasError = false;
const shouldRetry = true;
const canEdit = false;

// ❌ Bad
const loading = true;
const error = false;
```

**Constants:**

- SCREAMING_SNAKE_CASE for true constants
- camelCase for configuration objects

```typescript
// ✅ Good
const MAX_RETRIES = 3;
const API_TIMEOUT_MS = 5000;
const DEFAULT_PAGE_SIZE = 20;

const clipConstants = {
  minDuration: 0.1,
  maxDuration: 3600,
};

// ❌ Bad
const maxRetries = 3; // Should be SCREAMING_SNAKE_CASE
const API_CONFIG = { timeout: 5000 }; // Should be camelCase object
```

### Classes and Types

**Classes:**

- PascalCase
- Descriptive, noun-based names
- Service suffix for service classes

```typescript
// ✅ Good
class ProjectService {
  constructor(private supabase: SupabaseClient) {}
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// ❌ Bad
class projectService {} // Should be PascalCase
class Service {} // Too generic
```

**Interfaces and Types:**

- PascalCase
- No `I` prefix for interfaces
- `Type` suffix optional for complex types

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

type UserId = Brand<string, 'UserId'>;
type APIResponse<T> = SuccessResponse<T> | ErrorResponse;

// ❌ Bad
interface IUser {} // No I prefix
interface user {} // Should be PascalCase
type userId = string; // Should be PascalCase
```

**Enums:**

- PascalCase for enum name
- SCREAMING_SNAKE_CASE or PascalCase for values

```typescript
// ✅ Good
enum HttpStatusCode {
  OK = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
}

enum ErrorCategory {
  Database = 'DATABASE',
  Validation = 'VALIDATION',
  Network = 'NETWORK',
}

// ❌ Bad
enum httpStatusCode {} // Should be PascalCase
enum HttpStatusCode {
  ok = 200, // Should be SCREAMING_SNAKE_CASE or PascalCase
}
```

### React Components

**Component Names:**

- PascalCase
- Descriptive, noun-based

```typescript
// ✅ Good
function UserProfile() {}
function ProjectCard() {}
function TimelineView() {}

// ❌ Bad
function userProfile() {} // Should be PascalCase
function Timeline() {} // Too generic for a view component
function TCView() {} // Abbreviations unclear
```

**Props Interfaces:**

- Component name + `Props` suffix

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button(props: ButtonProps) {}

// ❌ Bad
interface IButtonProps {} // No I prefix
interface Props {} // Too generic
```

**Event Handlers:**

- `handle` prefix for definitions
- `on` prefix for props

```typescript
// ✅ Good
interface ButtonProps {
  onClick?: () => void;
  onSubmit?: () => void;
}

function Button({ onClick }: ButtonProps) {
  const handleClick = () => {
    // Handle logic
    onClick?.();
  };

  return <button onClick={handleClick}>Click me</button>;
}

// ❌ Bad
interface ButtonProps {
  handleClick?: () => void; // Should be onClick
}
```

### Custom Hooks

**Hook Names:**

- `use` prefix
- camelCase
- Descriptive of what they return or do

```typescript
// ✅ Good
function useDebounce<T>(value: T, delay: number): T {}
function useAutosave(data: unknown, interval: number): void {}
function useVideoGeneration(): VideoGenerationHook {}

// ❌ Bad
function debounce() {} // Missing use prefix
function useHook() {} // Too generic
function UseDebounce() {} // Should be camelCase
```

---

## TypeScript Style

### Type Annotations

**Function Return Types:**

- Always specify return types for functions

```typescript
// ✅ Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

async function fetchUser(id: string): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`);
  return response.ok ? response.json() : null;
}

// ❌ Bad
function calculateTotal(items: Item[]) {
  // No return type
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Variable Types:**

- Prefer type inference for simple cases
- Explicit types for complex cases or public APIs

```typescript
// ✅ Good - inference
const name = 'John'; // Type inferred as string
const age = 30; // Type inferred as number
const items = ['a', 'b', 'c']; // Type inferred as string[]

// ✅ Good - explicit for clarity
const userId: UserId = brandValue<UserId>('user-123');
const config: AppConfig = {
  timeout: 5000,
  retries: 3,
};

// ❌ Bad - unnecessary explicit types
const name: string = 'John'; // Redundant
const age: number = 30; // Redundant
```

### Type vs Interface

**Use `type` for:**

- Branded types
- Union types
- Discriminated unions
- Utility types
- Function signatures

```typescript
// ✅ Good
type UserId = Brand<string, 'UserId'>;
type APIError = ValidationError | RateLimitError | ServerError;
type Handler = (request: Request) => Response;
```

**Use `interface` for:**

- Object shapes
- Extendable contracts
- React component props

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}
```

### Type Imports

**Always use `type` modifier for type-only imports:**

```typescript
// ✅ Good
import { type User, type Project } from '@/types/api';
import type { SupabaseClient } from '@supabase/supabase-js';

// ❌ Bad
import { User, Project } from '@/types/api'; // Unclear if these are types or values
```

### Avoid `any`

**Never use `any` - use alternatives:**

```typescript
// ✅ Good
function logValue(value: unknown): void {
  console.log(value);
}

function processData<T>(data: T): T {
  return data;
}

// ❌ Bad
function logValue(value: any): void {} // Use unknown
function processData(data: any) {} // Use generics
```

---

## React Component Style

### Component Structure

**Order of elements in component:**

1. Imports
2. Type definitions
3. Component function
4. Helper functions (if needed)
5. Export

```typescript
// ✅ Good
import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);

  // Component logic

  return (
    <div>
      <h1>{user?.name}</h1>
    </div>
  );
}
```

### Hooks Order

**Standard hook order:**

1. Context hooks
2. State hooks
3. Ref hooks
4. Effect hooks
5. Custom hooks

```typescript
// ✅ Good
function MyComponent() {
  // Context
  const auth = useAuth();
  const theme = useTheme();

  // State
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    // Side effect
  }, []);

  // Custom hooks
  const debouncedValue = useDebounce(count, 500);

  return <div>...</div>;
}
```

### JSX Style

**Multiline JSX:**

```tsx
// ✅ Good - multiline for multiple props
<Button
  variant="primary"
  size="lg"
  onClick={handleClick}
  disabled={isLoading}
>
  Submit
</Button>

// ✅ Good - single line for simple elements
<Button onClick={handleClick}>Submit</Button>

// ❌ Bad - hard to read
<Button variant="primary" size="lg" onClick={handleClick} disabled={isLoading}>Submit</Button>
```

**Conditional Rendering:**

```tsx
// ✅ Good - ternary for simple cases
{
  isLoading ? <Spinner /> : <Content />;
}

// ✅ Good - && for single branch
{
  error && <ErrorMessage error={error} />;
}

// ✅ Good - early return for complex cases
if (isLoading) {
  return <Spinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

return <Content />;

// ❌ Bad - nested ternaries
{
  isLoading ? <Spinner /> : error ? <Error /> : <Content />;
}
```

---

## Import Organization

### Import Order

1. React and Next.js
2. Third-party libraries
3. Absolute imports (@/)
4. Relative imports
5. Type imports (grouped separately)
6. CSS/Styles

```typescript
// ✅ Good
// React and Next.js
import { NextRequest, NextResponse } from 'next/server';
import { useState, useEffect } from 'react';

// Third-party libraries
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Absolute imports
import { serverLogger } from '@/lib/serverLogger';
import { withAuth } from '@/lib/api/withAuth';
import { Button } from '@/components/ui/Button';

// Relative imports
import { helper } from './helper';
import { constants } from './constants';

// Type imports
import type { User, Project } from '@/types/api';
import type { SupabaseClient } from '@supabase/supabase-js';

// Styles
import './styles.css';
```

### Import Grouping

**Group related imports:**

```typescript
// ✅ Good
import { validateUUID, validateString, validateEnum, type ValidationError } from '@/lib/validation';

// ❌ Bad
import { validateUUID } from '@/lib/validation';
import { validateString } from '@/lib/validation';
import { validateEnum } from '@/lib/validation';
```

---

## Comment Style

### JSDoc Comments

**Use JSDoc for functions and classes:**

````typescript
/**
 * Creates a new project for the specified user.
 *
 * @param userId - The ID of the user creating the project
 * @param options - Project creation options
 * @returns The newly created project
 * @throws {ValidationError} If the project data is invalid
 * @throws {DatabaseError} If the database operation fails
 *
 * @example
 * ```typescript
 * const project = await service.createProject('user-123', {
 *   title: 'My Project',
 * });
 * ```
 */
async function createProject(userId: string, options: CreateProjectOptions): Promise<Project> {
  // Implementation
}
````

### Inline Comments

**Use inline comments sparingly:**

```typescript
// ✅ Good - explains WHY
// Cache the result to avoid repeated database queries
const cached = await cache.get(key);

// Validate UUID format before database lookup to fail fast
validateUUID(projectId, 'Project ID');

// ❌ Bad - explains WHAT (code is self-explanatory)
// Add 1 to count
count = count + 1;

// Call the function
doSomething();
```

### Comment Style

```typescript
// ✅ Good - sentence case, proper punctuation
// This is a comment explaining the code.

// ❌ Bad - all lowercase, no punctuation
// this is a comment
```

### TODO Comments

**Format for TODO comments:**

```typescript
// TODO: Implement caching for user profiles
// TODO(username): Fix race condition in video generation
// FIXME: Memory leak in timeline store
// HACK: Temporary workaround for API bug
// NOTE: This must be called before initializing the store
```

---

## File Organization

### File Structure

**Organize code in logical blocks:**

```typescript
// ✅ Good structure
// 1. Imports
import { create } from 'zustand';

// 2. Constants
const MAX_RETRIES = 3;

// 3. Type definitions
interface Config {
  timeout: number;
}

// 4. Helper functions
function retry() {}

// 5. Main implementation
export function main() {}

// 6. Exports
export { Config, retry };
```

### Module Exports

**Use named exports:**

```typescript
// ✅ Good - named exports
export function createProject() {}
export function deleteProject() {}
export type { Project, CreateProjectOptions };

// ❌ Bad - default export for utilities
export default {
  createProject,
  deleteProject,
};
```

**Use default export for React components:**

```typescript
// ✅ Good - default export for page components
export default function ProjectPage() {
  return <div>...</div>;
}

// ✅ Also good - named export for reusable components
export function Button() {
  return <button>...</button>;
}
```

---

## Test Writing Style

### Test File Naming

**Match source file with `.test` suffix:**

```
// Source files
lib/services/projectService.ts
components/ui/Button.tsx
app/api/projects/route.ts

// Test files
__tests__/services/projectService.test.ts
__tests__/components/ui/Button.test.tsx
__tests__/api/projects/route.test.ts
```

### Test Structure

**Follow AAA Pattern** (Arrange-Act-Assert):

```typescript
// ✅ Good - Clear AAA structure
test('creates project with valid data', async () => {
  // Arrange - Set up test data and mocks
  const mockSupabase = createMockSupabaseClient();
  const user = mockAuthenticatedUser(mockSupabase);
  mockSupabase.mockResolvedValue({ data: project, error: null });

  // Act - Perform the action
  const result = await createProject(user.id, { title: 'Test' });

  // Assert - Verify the outcome
  expect(result).toBeDefined();
  expect(result.title).toBe('Test');
  expect(mockSupabase.from).toHaveBeenCalledWith('projects');
});

// ❌ Bad - No clear structure
test('test1', async () => {
  const mockSupabase = createMockSupabaseClient();
  mockAuthenticatedUser(mockSupabase);
  const result = await createProject('user-123', { title: 'Test' });
  mockSupabase.mockResolvedValue({ data: {}, error: null });
  expect(result).toBeDefined();
});
```

### Test Naming

**Use descriptive names that explain the behavior:**

```typescript
// ✅ Good - Descriptive test names
test('returns 401 when user is not authenticated');
test('creates project with valid title and user ID');
test('shows error message when API call fails');
test('disables submit button while loading');
test('updates timeline state when clip is added');

// ❌ Bad - Unclear test names
test('test1');
test('works');
test('check button');
test('api test');
test('should test the function');
```

**Naming Convention:**

- Start with what the test does: "returns", "creates", "shows", "validates"
- Include the condition: "when user is authenticated", "with valid data"
- Be specific: "shows error message" not "handles errors"

### Mock Setup

**Always reset mocks between tests:**

```typescript
// ✅ Good - Clean slate for each test
beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase = createMockSupabaseClient();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ❌ Bad - Mocks carry over between tests
describe('MyTests', () => {
  const mockSupabase = createMockSupabaseClient(); // Set once, never reset

  test('test 1', () => {
    /* ... */
  });
  test('test 2', () => {
    /* ... */
  }); // May be affected by test 1
});
```

### Async Testing

**Always await async operations:**

```typescript
// ✅ Good - Proper async handling
test('loads data asynchronously', async () => {
  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});

// ❌ Bad - Missing await
test('loads data', () => {  // Missing async keyword
  render(<MyComponent />);

  waitFor(() => {  // Not awaited
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});

// ❌ Bad - Using setTimeout
test('waits for update', async () => {
  render(<MyComponent />);

  await new Promise(resolve => setTimeout(resolve, 1000));  // Don't do this
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

### Component Testing

**Test user behavior, not implementation:**

```typescript
// ✅ Good - Tests what user sees/does
test('submits form when user clicks submit button', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  await waitFor(() => {
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });
});

// ❌ Bad - Tests implementation details
test('updates state on submit', () => {
  const { component } = render(<LoginForm />);

  component.setState({ email: 'test@example.com' });  // Don't access internal state
  expect(component.state.isSubmitting).toBe(true);     // Don't test state directly
});
```

### Query Selectors

**Use queries in order of preference:**

1. **Role queries** (most accessible):

```typescript
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('textbox', { name: 'Email' });
```

2. **Label queries** (for form fields):

```typescript
screen.getByLabelText('Email address');
screen.getByPlaceholderText('Enter your email');
```

3. **Text queries** (for static content):

```typescript
screen.getByText('Welcome back');
screen.getByText(/error/i); // Regex for case-insensitive
```

4. **Test ID** (last resort):

```typescript
screen.getByTestId('complex-widget'); // Only when other queries don't work
```

**Avoid:**

```typescript
// ❌ Bad - Too brittle, breaks with any DOM change
container.querySelector('.my-class');
container.getElementsByClassName('button')[0];
```

### withAuth Pattern for API Routes

**Always use the standard pattern:**

```typescript
// ✅ Good - Standard pattern
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: mockWithAuth,
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('GET /api/projects', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  it('returns projects', async () => {
    mockAuthenticatedUser(mockSupabase);
    // ... test code
  });
});

// ❌ Bad - Inconsistent pattern
describe('GET /api/projects', () => {
  it('returns projects', async () => {
    // Mocking inside test - won't work consistently
    jest.mock('@/lib/api/withAuth');
  });
});
```

### Comments in Tests

**Add comments only for non-obvious setup:**

```typescript
// ✅ Good - Explains WHY
test('handles rate limit correctly', async () => {
  // Mock 5 failed attempts to trigger rate limit
  for (let i = 0; i < 5; i++) {
    await attemptLogin('wrong-password');
  }

  // Next attempt should be rate limited
  const response = await attemptLogin('correct-password');
  expect(response.status).toBe(429);
});

// ❌ Bad - States the obvious
test('creates user', async () => {
  // Create mock data
  const user = { email: 'test@example.com' };

  // Call the function
  const result = await createUser(user);

  // Check the result
  expect(result).toBeDefined();
});
```

### Test Organization

**Group related tests with describe blocks:**

```typescript
// ✅ Good - Logical grouping
describe('ProjectService', () => {
  describe('createProject', () => {
    it('creates project with valid data');
    it('rejects invalid project title');
    it('enforces user project limit');
  });

  describe('deleteProject', () => {
    it('deletes project owned by user');
    it('rejects deletion of others projects');
    it('cleans up associated assets');
  });
});

// ❌ Bad - Flat structure
describe('ProjectService', () => {
  it('creates project with valid data');
  it('deletes project owned by user');
  it('rejects invalid project title');
  it('rejects deletion of others projects');
  it('enforces user project limit');
  it('cleans up associated assets');
});
```

## Git Commit Style

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples

```
✅ Good:
feat: Add video generation with Veo 3 model

Implement support for Google's Veo 3 video generation model with
customizable aspect ratios and duration settings.

Closes #123

✅ Good:
fix: Resolve race condition in timeline store

Prevent duplicate clips from being added when rapid
updates occur by implementing clip deduplication.

✅ Good:
docs: Update API documentation for rate limiting

Add examples and clarify tier-based rate limiting strategy.

❌ Bad:
Fixed stuff
Updated code
WIP
```

### Commit Guidelines

- **Subject line:** Max 50 characters, imperative mood
- **Body:** Wrap at 72 characters, explain WHAT and WHY
- **Footer:** Reference issues/PRs

---

## Automated Enforcement

### Pre-commit Hooks

The project uses Husky with lint-staged to enforce style:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"]
  }
}
```

### Running Style Checks

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check

# Run all checks
npm run validate
```

---

## IDE Configuration

### VS Code Settings

Recommended `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Recommended Extensions

- Prettier - Code formatter
- ESLint
- TypeScript and JavaScript Language Features

---

## Summary Checklist

Before committing code, ensure:

- [ ] Code is formatted with Prettier
- [ ] No ESLint errors or warnings
- [ ] Naming conventions are followed
- [ ] TypeScript types are properly defined
- [ ] Imports are organized
- [ ] Comments are clear and necessary
- [ ] Commit message follows format

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
