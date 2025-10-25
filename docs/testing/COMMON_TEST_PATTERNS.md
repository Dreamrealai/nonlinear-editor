# Common Test Patterns

**Last Updated:** 2025-10-25

## Overview

This guide provides reusable test patterns for common scenarios in the codebase. Copy these patterns when writing new tests to ensure consistency and reliability.

## Table of Contents

- [API Route Testing](#api-route-testing)
- [Component Testing](#component-testing)
- [Hook Testing](#hook-testing)
- [Service Testing](#service-testing)
- [Integration Testing](#integration-testing)
- [Mock Patterns](#mock-patterns)

---

## API Route Testing

### Basic Setup Pattern

```typescript
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/your-route/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils';

// Mock withAuth
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    return handler(req, { user, supabase }, context);
  },
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('API Route Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  // ... tests here
});
```

### Authentication Tests

```typescript
describe('Authentication', () => {
  it('should return 401 when user not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);

    const request = new NextRequest('http://localhost/api/test');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 200 when user authenticated', async () => {
    mockAuthenticatedUser(mockSupabase);

    const request = new NextRequest('http://localhost/api/test');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

### Authorization Tests

```typescript
describe('Authorization', () => {
  it('should return 403 when user lacks permission', async () => {
    mockAuthenticatedUser(mockSupabase, {
      id: 'user-id',
      tier: 'free',
    });

    const request = new NextRequest('http://localhost/api/premium-feature');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('permission');
  });

  it('should allow access for premium users', async () => {
    mockAuthenticatedUser(mockSupabase, {
      id: 'user-id',
      tier: 'premium',
    });

    const request = new NextRequest('http://localhost/api/premium-feature');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

### Input Validation Tests

```typescript
describe('Input Validation', () => {
  beforeEach(() => {
    mockAuthenticatedUser(mockSupabase);
  });

  it('should return 400 for missing required field', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({}), // Missing required field
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('required');
  });

  it('should return 400 for invalid UUID', async () => {
    const request = new NextRequest('http://localhost/api/test/invalid-uuid');
    const response = await GET(request, { params: { id: 'invalid-uuid' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid');
  });

  it('should accept valid input', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        description: 'Description',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
  });
});
```

### Database Error Handling

```typescript
describe('Database Error Handling', () => {
  beforeEach(() => {
    mockAuthenticatedUser(mockSupabase);
  });

  it('should return 500 for database error', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    });

    const request = new NextRequest('http://localhost/api/test');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should return 404 for not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      }),
    });

    const request = new NextRequest('http://localhost/api/test/123');
    const response = await GET(request);

    expect(response.status).toBe(404);
  });
});
```

### Success Response Tests

```typescript
describe('Success Responses', () => {
  beforeEach(() => {
    mockAuthenticatedUser(mockSupabase);
  });

  it('should return correct data structure', async () => {
    const mockData = {
      id: 'test-id',
      name: 'Test Item',
      created_at: '2024-01-01',
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const request = new NextRequest('http://localhost/api/test/test-id');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockData);
  });

  it('should return 201 for created resource', async () => {
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'new-id' },
        error: null,
      }),
    });

    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Item' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
  });
});
```

---

## Component Testing

### Basic Component Setup

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render component', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### User Interaction Tests

```typescript
describe('User Interactions', () => {
  it('should handle button click', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should handle text input', async () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello');

    expect(input).toHaveValue('Hello');
    expect(onChange).toHaveBeenCalledTimes(5); // Once per character
  });

  it('should handle form submission', async () => {
    const onSubmit = jest.fn();
    render(<Form onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/name/i), 'John');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John',
    });
  });
});
```

### Async State Updates

```typescript
describe('Async State Updates', () => {
  it('should show loading state', async () => {
    render(<AsyncComponent />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/loaded/i)).toBeInTheDocument();
  });

  it('should handle async error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));

    render(<AsyncComponent />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Conditional Rendering

```typescript
describe('Conditional Rendering', () => {
  it('should show element when condition is true', () => {
    render(<ConditionalComponent showElement={true} />);
    expect(screen.getByTestId('element')).toBeInTheDocument();
  });

  it('should hide element when condition is false', () => {
    render(<ConditionalComponent showElement={false} />);
    expect(screen.queryByTestId('element')).not.toBeInTheDocument();
  });

  it('should toggle visibility on state change', async () => {
    render(<ToggleComponent />);

    expect(screen.queryByTestId('element')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show/i }));

    expect(screen.getByTestId('element')).toBeInTheDocument();
  });
});
```

### Props and State Tests

```typescript
describe('Props and State', () => {
  it('should render with default props', () => {
    render(<Component />);
    expect(screen.getByText('Default Text')).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    render(<Component text="Custom Text" />);
    expect(screen.getByText('Custom Text')).toBeInTheDocument();
  });

  it('should update on prop change', () => {
    const { rerender } = render(<Component count={0} />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    rerender(<Component count={5} />);
    expect(screen.getByText('Count: 5')).toBeInTheDocument();
  });
});
```

---

## Hook Testing

### Basic Hook Setup

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMyHook } from '@/lib/hooks/useMyHook';

describe('useMyHook', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe('default');
  });
});
```

### State Hook Tests

```typescript
describe('State Management', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue('changed');
      result.current.reset();
    });

    expect(result.current.value).toBe('default');
  });
});
```

### Effect Hook Tests

```typescript
describe('useEffect Hooks', () => {
  it('should run effect on mount', () => {
    const effect = jest.fn();
    renderHook(() => useMyEffect(effect));

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('should run effect on dependency change', () => {
    const effect = jest.fn();
    const { rerender } = renderHook(
      ({ dep }) => useMyEffect(effect, [dep]),
      { initialProps: { dep: 'a' } }
    );

    expect(effect).toHaveBeenCalledTimes(1);

    rerender({ dep: 'b' });

    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('should cleanup on unmount', () => {
    const cleanup = jest.fn();
    const effect = jest.fn(() => cleanup);

    const { unmount } = renderHook(() => useMyEffect(effect));
    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
```

### Async Hook Tests

```typescript
describe('Async Hooks', () => {
  it('should fetch data on mount', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: 'test' }),
    });

    const { result } = renderHook(() => useDataFetch('/api/test'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ data: 'test' });
  });

  it('should handle fetch error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useDataFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error.message).toBe('Failed');
  });
});
```

### Custom Hook with Context

```typescript
import { renderHook } from '@testing-library/react';
import { MyContext } from '@/contexts/MyContext';

describe('useContextHook', () => {
  it('should use context value', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MyContext.Provider value={{ user: 'test-user' }}>
        {children}
      </MyContext.Provider>
    );

    const { result } = renderHook(() => useMyContextHook(), { wrapper });

    expect(result.current.user).toBe('test-user');
  });
});
```

---

## Service Testing

### Service Class Setup

```typescript
import { MyService } from '@/lib/services/myService';
import { createMockSupabaseClient } from '@/test-utils';

describe('MyService', () => {
  let service: MyService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new MyService(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ... tests here
});
```

### CRUD Operation Tests

```typescript
describe('CRUD Operations', () => {
  it('should create item', async () => {
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'new-id', name: 'Test' },
        error: null,
      }),
    });

    const result = await service.create({ name: 'Test' });

    expect(result).toEqual({ id: 'new-id', name: 'Test' });
    expect(mockSupabase.from).toHaveBeenCalledWith('table_name');
  });

  it('should read item by ID', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'test-id', name: 'Test' },
        error: null,
      }),
    });

    const result = await service.getById('test-id');

    expect(result).toEqual({ id: 'test-id', name: 'Test' });
  });

  it('should update item', async () => {
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'test-id', name: 'Updated' },
        error: null,
      }),
    });

    const result = await service.update('test-id', { name: 'Updated' });

    expect(result.name).toBe('Updated');
  });

  it('should delete item', async () => {
    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    await service.delete('test-id');

    expect(mockSupabase.from).toHaveBeenCalledWith('table_name');
  });
});
```

### Error Handling Tests

```typescript
describe('Error Handling', () => {
  it('should throw on database error', async () => {
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    });

    await expect(service.create({ name: 'Test' })).rejects.toThrow('Database error');
  });

  it('should handle not found error', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    });

    await expect(service.getById('nonexistent')).rejects.toThrow('Not found');
  });
});
```

---

## Integration Testing

### Multi-Service Integration

```typescript
import { ServiceA } from '@/lib/services/serviceA';
import { ServiceB } from '@/lib/services/serviceB';
import { createMockSupabaseClient } from '@/test-utils';

describe('Service Integration', () => {
  let serviceA: ServiceA;
  let serviceB: ServiceB;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    serviceA = new ServiceA(mockSupabase);
    serviceB = new ServiceB(mockSupabase);
  });

  it('should coordinate between services', async () => {
    // Setup ServiceA mock
    mockSupabase.from.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'a-id' },
        error: null,
      }),
    });

    // Setup ServiceB mock
    mockSupabase.from.mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'b-id', a_id: 'a-id' },
        error: null,
      }),
    });

    // Test integration
    const resultA = await serviceA.create({ name: 'A' });
    const resultB = await serviceB.create({ name: 'B', a_id: resultA.id });

    expect(resultB.a_id).toBe(resultA.id);
  });
});
```

---

## Mock Patterns

### Supabase Query Builder Mock

```typescript
const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
});
```

### Fetch Mock Pattern

```typescript
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('should mock fetch response', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: 'test' }),
  });

  const response = await fetch('/api/test');
  const data = await response.json();

  expect(data).toEqual({ data: 'test' });
});
```

---

## Additional Resources

- [TEST_ARCHITECTURE.md](/docs/TEST_ARCHITECTURE.md) - Test infrastructure
- [TEST_RELIABILITY_GUIDE.md](./TEST_RELIABILITY_GUIDE.md) - Writing stable tests
- [COVERAGE_IMPROVEMENT_GUIDE.md](./COVERAGE_IMPROVEMENT_GUIDE.md) - Improving coverage

---

**Copy these patterns when writing new tests. Consistency improves maintainability.**
