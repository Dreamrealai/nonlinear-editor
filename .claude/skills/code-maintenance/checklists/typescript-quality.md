# TypeScript Quality Checklist

## Type Safety

### Branded Types for IDs
- [ ] `UserId` type is branded: `string & { readonly __brand: 'UserId' }`
- [ ] `ProjectId` type is branded
- [ ] `AssetId` type is branded
- [ ] `ClipId` type is branded
- [ ] Function parameters use branded types instead of `string`
- [ ] Database foreign keys correspond to branded types

### No `any` Usage
- [ ] No explicit `: any` types (except in well-justified cases with comments)
- [ ] Use `unknown` for truly unknown types
- [ ] Use type guards to narrow `unknown` types
- [ ] External API responses typed with interfaces
- [ ] Third-party library types properly imported

### Explicit Return Types
- [ ] All exported functions have return types
- [ ] All service methods have return types
- [ ] All API route handlers have return types
- [ ] All custom hooks have return types
- [ ] Arrow functions in complex logic have return types

### Discriminated Unions
- [ ] Status fields use discriminated unions, not plain strings
- [ ] Result types use discriminated unions: `Success | Error`
- [ ] Event types use discriminated unions
- [ ] State machine states use discriminated unions

### Type Guards
- [ ] Assertion functions for validation (`assertValidUser()`)
- [ ] Type predicates for runtime checks (`isUser()`)
- [ ] Type guards before unsafe operations
- [ ] Null/undefined checks use strict equality

## Interface Design

### Proper Interfaces
- [ ] Interfaces for API requests/responses
- [ ] Interfaces for component props
- [ ] Interfaces for service dependencies
- [ ] Interfaces for Zustand store state
- [ ] Interfaces for database models

### Type vs Interface
- [ ] Use `type` for unions and intersections
- [ ] Use `interface` for object shapes
- [ ] Use `type` for branded types
- [ ] Use `interface` for extensible contracts

### Generic Types
- [ ] Reusable types use generics appropriately
- [ ] API response types use generics: `ApiResponse<T>`
- [ ] Service methods use generics when appropriate
- [ ] Avoid overly complex generic constraints

## Compilation

### No TypeScript Errors
- [ ] `npx tsc --noEmit` passes without errors
- [ ] No `@ts-ignore` comments (or justified with explanation)
- [ ] No `@ts-expect-error` without explanation
- [ ] Strict mode enabled in tsconfig.json
- [ ] No implicit any errors

### Import Resolution
- [ ] All imports resolve correctly
- [ ] Path aliases work (`@/lib/...`)
- [ ] No circular dependencies
- [ ] Types imported from correct locations

## Project-Specific Patterns

### Supabase Types
- [ ] Database types generated and up-to-date
- [ ] Row types used for database models
- [ ] Insert types used for create operations
- [ ] Update types used for update operations
- [ ] Branded types for database IDs

### Next.js Types
- [ ] Route params properly typed
- [ ] Search params properly typed
- [ ] API route handlers have correct signatures
- [ ] Metadata types used for pages
- [ ] Server component vs client component types correct

### React Types
- [ ] Props interfaces for all components
- [ ] Ref types when using forwardRef
- [ ] Event handler types explicit
- [ ] Children type when accepting children
- [ ] Generic component types when needed

### Zustand Types
- [ ] Store state interface defined
- [ ] Store actions have explicit types
- [ ] Selector functions are typed
- [ ] Middleware types correct (Immer)
