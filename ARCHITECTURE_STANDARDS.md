# Architecture Standards & Guidelines

**Date Created**: 2025-10-23
**Status**: Active
**Related Issues**: MED-018 through MED-024 (Architecture Inconsistencies)

## Purpose

This document establishes consistent architectural patterns and coding standards for the non-linear video editor codebase. These standards address the MED-018-024 architecture inconsistencies identified in the codebase audit.

---

## MED-018-024: Architecture Inconsistencies - Issues Identified

### 1. Export Pattern Inconsistencies (MED-018)

**Issue**: Mixed use of default exports vs named exports
**Current State**:

- 41 files using `export default function`
- 110 files using `export function` or `export const`
- No consistent pattern across the codebase

**Standard**: Use **named exports** for all components, hooks, and utilities

**Rationale**:

- Better IDE auto-import support
- Easier refactoring and renaming
- Clear intent - name is preserved across imports
- Prevents accidental renaming during imports
- Better tree-shaking in modern bundlers

**Examples**:

```typescript
// ❌ INCORRECT - Default export
export default function UserMenu() {
  // ...
}

// ✅ CORRECT - Named export
export function UserMenu() {
  // ...
}
```

**Exception**: Page components in `/app` directory should use default exports as required by Next.js routing.

### 2. Props Interface Inconsistencies (MED-019)

**Issue**: Props interfaces defined in different locations and with different naming conventions

**Current State**:

- Some interfaces exported separately
- Some interfaces defined inline
- Inconsistent naming (Props vs ComponentNameProps)

**Standard**:

- Always define Props interfaces above the component
- Always use the naming pattern: `{ComponentName}Props`
- Export Props interfaces when they might be used externally
- Place interface immediately before component definition

**Examples**:

```typescript
// ❌ INCORRECT - Inline, unnamed
function UserMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // ...
}

// ❌ INCORRECT - Generic name
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ✅ CORRECT - Named, exported, specific
export interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserMenu({ isOpen, onClose }: UserMenuProps) {
  // ...
}
```

### 3. Component Documentation Inconsistencies (MED-020)

**Issue**: Inconsistent JSDoc patterns and missing documentation

**Current State**:

- Some components have full JSDoc blocks
- Some have single-line comments
- Many have no documentation
- No consistent structure

**Standard**: All components must have standardized JSDoc documentation

**Template**:

````typescript
/**
 * ComponentName
 *
 * Brief description of what the component does and its purpose.
 *
 * Features:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 *
 * @example
 * ```tsx
 * <ComponentName prop1="value" onEvent={handler} />
 * ```
 */
````

**Required Sections**:

- Component name (heading)
- Brief description
- Key features (bullet list)
- Usage example (for complex components)

**Optional Sections**:

- @param for complex props (if not obvious from TypeScript)
- @returns (for utility functions)
- @throws (for functions that throw)

### 4. Type vs Interface Inconsistency (MED-021)

**Issue**: Mixed use of `type` and `interface` for Props definitions

**Current State**:

- 53 files use `interface` for Props
- Some use `type` for Props
- No clear pattern

**Standard**: Use `interface` for Props and component contracts

**Rationale**:

- Interfaces can be extended and augmented
- Better error messages
- Clearer intent for object shapes
- Conventional in React ecosystem

**Exceptions**: Use `type` for:

- Union types: `type Status = 'idle' | 'loading' | 'success'`
- Function types: `type Handler = (event: Event) => void`
- Mapped types and complex transformations

**Examples**:

```typescript
// ❌ INCORRECT - Type for Props
type UserMenuProps = {
  isOpen: boolean;
};

// ✅ CORRECT - Interface for Props
export interface UserMenuProps {
  isOpen: boolean;
}

// ✅ CORRECT - Type for unions
export type MenuState = 'open' | 'closed' | 'animating';
```

### 5. Hook Naming Inconsistencies (MED-022)

**Issue**: Inconsistent patterns for custom hooks

**Standard**: All custom hooks must:

- Start with `use` prefix
- Use camelCase
- Return values in consistent patterns
- Be documented with JSDoc

**Return Pattern Standards**:

```typescript
// ✅ Single value - return directly
export function useIsAuthenticated(): boolean {
  // ...
  return isAuth;
}

// ✅ Multiple values - return object
export function useAuth() {
  return {
    user,
    isLoading,
    signIn,
    signOut,
  };
}

// ✅ Multiple values with actions - return tuple for simple cases
export function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = () => setValue((v) => !v);
  return [value, toggle];
}
```

### 6. File Structure Inconsistencies (MED-023)

**Issue**: Inconsistent organization of imports, types, and exports

**Standard**: File structure order:

```typescript
// 1. File-level JSDoc (if needed)
/**
 * Module description
 * @module path/to/module
 */

// 2. 'use client' or 'use server' directives
'use client';

// 3. External imports (React, libraries)
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// 4. Internal absolute imports (aliased with @/)
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { browserLogger } from '@/lib/browserLogger';
import type { User } from '@/types/user';

// 5. Type definitions and interfaces
export interface ComponentNameProps {
  // ...
}

// 6. Constants (if component-specific)
const MAX_RETRIES = 3;

// 7. Component implementation
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // ...
}

// 8. Sub-components (if any, using same pattern)
```

### 7. Constant Naming Inconsistencies (MED-024)

**Issue**: Magic numbers and inconsistent constant definitions

**Current State**:

- Magic numbers scattered throughout code
- Some constants defined inline
- No centralized constant management
- Inconsistent naming (UPPER_CASE vs camelCase)

**Standard**:

**Naming Convention**:

- `UPPER_SNAKE_CASE` for primitive constants
- `camelCase` for complex objects

**Location Strategy**:

- Component-local constants: Define at top of file
- Shared UI constants: `/lib/constants/ui.ts`
- API constants: `/lib/constants/api.ts`
- Business logic constants: `/lib/constants/business.ts`

**Examples**:

```typescript
// ❌ INCORRECT - Magic number
setTimeout(callback, 300);

// ✅ CORRECT - Named constant
const DEBOUNCE_DELAY_MS = 300;
setTimeout(callback, DEBOUNCE_DELAY_MS);

// ✅ CORRECT - Centralized (from lib/constants/ui.ts)
import { TIME_CONSTANTS } from '@/lib/constants/ui';
setTimeout(callback, TIME_CONSTANTS.DEBOUNCE_DEFAULT);
```

---

## Implementation Priority

### Phase 1: Critical Patterns (Week 1)

1. ✅ Fix export patterns for new components
2. ✅ Establish Props interface standards
3. Create architecture standards document (this file)

### Phase 2: Documentation (Week 2)

1. Add JSDoc to all public components
2. Document all custom hooks
3. Add usage examples for complex components

### Phase 3: Gradual Migration (Weeks 3-4)

1. Convert high-traffic components to standards
2. Update imported references
3. Maintain backward compatibility

### Phase 4: Enforcement (Week 5+)

1. Add ESLint rules for standards
2. Pre-commit hooks for verification
3. Code review checklist

---

## Automated Enforcement

### ESLint Rules (To Be Configured)

```json
{
  "rules": {
    "import/no-default-export": "warn",
    "import/prefer-default-export": "off",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"],
        "custom": {
          "regex": "^I[A-Z]",
          "match": false
        }
      }
    ]
  }
}
```

### Pre-commit Checks

```bash
# Verify Props interfaces are properly named
grep -r "interface Props[^A-Z]" components/ && exit 1

# Verify JSDoc exists for exported components
# (To be implemented)
```

---

## Migration Strategy

### Converting Default to Named Exports

**DO NOT** mass-convert all files at once. This creates merge conflicts and breaks existing code.

**DO** convert incrementally:

1. When touching a file for other reasons
2. Start with leaf components (no dependents)
3. Update all imports in same commit
4. Test thoroughly
5. Document in commit message

**Example Migration**:

```bash
# 1. Identify component
# 2. Change export
sed -i '' 's/export default function UserMenu/export function UserMenu/' components/UserMenu.tsx

# 3. Find all imports
grep -r "import.*UserMenu.*from" --include="*.tsx" --include="*.ts"

# 4. Update each import
sed -i '' 's/import UserMenu from/import { UserMenu } from/' components/EditorHeader.tsx

# 5. Test
npm run build && npm run test
```

---

## Checklist for New Components

When creating a new component, ensure:

- [ ] Uses named export (`export function ComponentName`)
- [ ] Has Props interface with `ComponentNameProps` naming
- [ ] Has JSDoc documentation with description and features
- [ ] Imports organized (external → internal → types → constants)
- [ ] Uses constants instead of magic numbers
- [ ] TypeScript interface (not type) for Props
- [ ] Props interface exported if used externally
- [ ] Custom hooks follow `use*` naming with proper returns

---

## Code Review Guidelines

### For Reviewers

Check for:

1. Named exports (not default)
2. Props interface properly named and placed
3. JSDoc documentation present
4. No magic numbers
5. Consistent file structure
6. Type vs interface usage

### For Authors

Before submitting PR:

1. Run `npm run build` (verify no type errors)
2. Run `npm run lint` (verify code style)
3. Check this document for standards
4. Add JSDoc to new components
5. Extract magic numbers to constants

---

## Exceptions

### When to Use Default Exports

1. **Next.js Pages**: Required by framework

   ```typescript
   // app/page.tsx
   export default function HomePage() {}
   ```

2. **Next.js Layouts**: Required by framework

   ```typescript
   // app/layout.tsx
   export default function RootLayout() {}
   ```

3. **Next.js Error Pages**: Required by framework

   ```typescript
   // app/error.tsx
   export default function Error() {}
   ```

4. **Dynamic Imports**: When using Next.js `dynamic()`
   ```typescript
   const LazyComponent = dynamic(() => import('./Component'));
   ```

### When to Use Inline Props

For very simple, one-off components that won't be reused:

```typescript
function SimpleButton({ label }: { label: string }) {
  return <button>{label}</button>;
}
```

---

## Related Documents

- `/ISSUETRACKING.md` - Status of MED-018-024 issues
- `/lib/constants/ui.ts` - Centralized UI constants
- `/MIGRATION_GUIDE.md` - Store migration patterns
- `.eslintrc.json` - Linting rules

---

## Change Log

| Date       | Change                             | Author         |
| ---------- | ---------------------------------- | -------------- |
| 2025-10-23 | Initial standards document created | Claude Agent 7 |
| 2025-10-23 | Fixed UserMenu export pattern      | Claude Agent 7 |

---

## Summary

These standards address the MED-018-024 architecture inconsistencies by establishing:

1. **MED-018**: Named exports standard
2. **MED-019**: Props interface naming and placement
3. **MED-020**: JSDoc documentation requirements
4. **MED-021**: Interface vs type usage guidelines
5. **MED-022**: Hook naming and return patterns
6. **MED-023**: File structure organization
7. **MED-024**: Constant naming and centralization

**Status**: ✅ Standards established, gradual migration in progress

**Next Steps**:

1. Configure ESLint rules
2. Add pre-commit hooks
3. Update component documentation
4. Migrate high-priority components
