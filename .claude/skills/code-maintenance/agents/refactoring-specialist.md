# Agent 6: Refactoring Specialist

## Mission
Identify refactoring opportunities, suggest code improvements, find missing abstractions, and recommend pattern upgrades.

## Core Responsibilities

1. **Extract Common Utilities** - Identify duplicated logic that should be utilities
2. **Component Decomposition** - Find components that should be split
3. **Hook Extraction** - Identify logic that should be custom hooks
4. **Abstraction Opportunities** - Find patterns that need abstraction
5. **Type Improvements** - Suggest better TypeScript patterns
6. **Code Simplification** - Identify overly complex code

## Execution Steps

### Step 1: Common Utility Extraction (4 min)

```typescript
// Find repeated utility patterns that should be extracted

// Pattern 1: Date/Time Formatting
Grep: "new Date.*toLocaleString|toISOString|toLocaleDateString" in **/*.ts **/*.tsx

Count occurrences across files:
If same date formatting in 3+ places:
  Add Finding: {
    "severity": "P3",
    "category": "Refactoring - Extract Utility",
    "location": "Multiple files (list top 3)",
    "issue": "Date formatting logic duplicated ${count} times",
    "recommendation": "Create formatDate() utility in /lib/utils/date.ts",
    "effort": "20 min"
  }

// Pattern 2: Number/Duration Formatting
Grep: "toFixed\\(|Math\\.round|toPrecision" in **/*.ts **/*.tsx

For duration/time calculations:
  If duplicated:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Extract Utility",
      "location": "Multiple locations",
      "issue": "Duration formatting logic duplicated",
      "recommendation": "Create formatDuration() utility in /lib/utils/format.ts"
    }

// Pattern 3: Array Utilities
Grep: "\\.reduce\\(|uniqueBy|groupBy" in **/*.ts **/*.tsx

Check for common array operations:
- Unique by property
- Group by property
- Chunk array
- Flatten nested arrays

If duplicated:
  Add Finding: {
    "severity": "P3",
    "category": "Refactoring - Extract Utility",
    "location": "Multiple files",
    "issue": "Array utility logic duplicated",
    "recommendation": "Create array utilities in /lib/utils/array.ts"
  }

// Pattern 4: URL/Path Utilities
Grep: "new URL|path\\.join|split\\('/'\\)" in **/*.ts

Check for path/URL manipulation:
If duplicated logic for asset URLs, API URLs, etc:
  Add Finding: {
    "severity": "P3",
    "category": "Refactoring - Extract Utility",
    "location": "Multiple files",
    "issue": "URL/path manipulation logic duplicated",
    "recommendation": "Create getAssetUrl(), buildApiPath() utilities"
  }
```

### Step 2: Component Decomposition (5 min)

```typescript
Glob: "components/**/*.tsx"

For each component file:
  Read: Component
  Analyze: Complexity metrics

  Metrics:
  1. Lines of code in component function
  2. Number of useState/useEffect hooks
  3. Number of child elements in JSX
  4. Cyclomatic complexity of conditional rendering

  Thresholds for decomposition:
  - >200 lines → Likely needs splitting
  - >5 useState → State should be extracted or split
  - >3 useEffect → Side effects should be in custom hooks
  - Deep JSX nesting (>5 levels) → Extract sub-components

  If SHOULD_DECOMPOSE:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Decompose Component",
      "location": "file:line",
      "issue": "Component has ${lines} lines and ${stateCount} state variables",
      "recommendation": "Split into:\n  - ${ComponentName}Container (logic)\n  - ${ComponentName}View (presentation)\n  Or extract sub-components for sections",
      "effort": "1-2 hours"
    }

// Specific check: Timeline component
Read: components/timeline/Timeline.tsx

Check:
- Should have TimelineTrack sub-components?
- Should have TimelineControls extracted?
- Should have TimelinePlayhead as separate component?

If monolithic:
  Add Finding with specific decomposition plan
```

### Step 3: Custom Hook Extraction (4 min)

```typescript
Glob: "components/**/*.tsx"

For each component:
  Read: Component code

  // Pattern 1: Repeated useEffect + useState combo
  Check: Are there multiple components with same hooks pattern?

  Example patterns to extract:
  - useEffect with resize listener → useWindowSize()
  - useEffect with keyboard listener → useKeyPress()
  - useState + useEffect for API call → useQuery()
  - useState + useEffect for local storage → useLocalStorage()

  If REPEATED_HOOK_PATTERN:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Extract Custom Hook",
      "location": "Multiple components",
      "issue": "${pattern} repeated in ${count} components",
      "recommendation": "Create use${HookName}() in /hooks/",
      "effort": "30 min",
      "benefit": "Reusable across ${count} components"
    }

// Pattern 2: Complex local state management
Check: Components with >5 useState for related state

If COMPLEX_STATE:
  Add Finding: {
    "severity": "P2",
    "category": "Refactoring - Extract State Hook",
    "location": "file",
    "issue": "Component managing complex related state with ${count} useState",
    "recommendation": "Extract to custom hook with useReducer or create Zustand store",
    "effort": "1 hour"
  }

// Pattern 3: Business logic in components
Check: Components with business logic (calculations, validations)

If BUSINESS_LOGIC:
  Add Finding: {
    "severity": "P2",
    "category": "Refactoring - Extract Logic Hook",
    "location": "file:line",
    "issue": "Business logic in component should be in custom hook",
    "recommendation": "Extract to use${Feature}Logic() hook",
    "effort": "45 min"
  }
```

### Step 4: API/Service Abstraction (3 min)

```typescript
// Check 1: Direct Supabase calls in components
Grep: "supabase\\.from\\(" in components/**/*.tsx

For each direct database call:
  Add Finding: {
    "severity": "P2",
    "category": "Refactoring - Extract to Service Layer",
    "location": "file:line",
    "issue": "Direct database query in component",
    "recommendation": "Move to service layer: /lib/services/${ServiceName}.ts",
    "effort": "20 min"
  }

// Check 2: API calls without abstraction
Grep: "fetch\\(|axios\\(" in components/**/*.tsx app/api/**/*.ts

For each API call:
  Check: Is it duplicated?
  Check: Is there a service for this domain?

  If NO_SERVICE:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Create Service",
      "location": "Multiple files",
      "issue": "${domain} API calls scattered across codebase",
      "recommendation": "Create ${Domain}Service in /lib/services/",
      "effort": "1 hour",
      "benefit": "Centralize ${domain} logic, enable caching"
    }

// Check 3: Missing service layer for features
Features to check:
- Video generation
- Audio processing
- Asset management
- Export handling
- User management

For each feature:
  Check: Does /lib/services/${Feature}Service.ts exist?
  Count: API routes and components using this feature

  If NO_SERVICE and used in 3+ places:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Missing Service",
      "location": "app/api/${feature}/ and components",
      "issue": "${Feature} logic not centralized in service layer",
      "recommendation": "Create ${Feature}Service with methods for all operations"
    }
```

### Step 5: Type System Improvements (3 min)

```typescript
// Check 1: Overly broad types
Grep: ":\\s*Record<string,\\s*any>|:\\s*\\{\\s*\\[key:\\s*string\\]" in **/*.ts

For each Record<string, any>:
  Read: Context
  Check: Can this be more specific?

  If CAN_BE_SPECIFIC:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Improve Type",
      "location": "file:line",
      "issue": "Using Record<string, any> instead of specific interface",
      "recommendation": "Define interface with known properties",
      "effort": "15 min"
    }

// Check 2: Missing discriminated unions
Grep: "status.*:\\s*string|type.*:\\s*string" in types/**/*.ts

For status/type fields:
  Check: Should this be a discriminated union?

  Example:
  ```typescript
  // ❌ Current
  type Job = {
    status: string
    result?: any
  }

  // ✅ Better
  type Job =
    | { status: 'pending' }
    | { status: 'processing'; progress: number }
    | { status: 'completed'; result: Result }
    | { status: 'failed'; error: Error }
  ```

  If SHOULD_BE_UNION:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Use Discriminated Union",
      "location": "file:line",
      "issue": "Status field using string instead of discriminated union",
      "recommendation": "Convert to discriminated union for type safety"
    }

// Check 3: Type repetition
Find interfaces/types defined in multiple files:

Grep: "interface.*Request|interface.*Response" in **/*.ts

For common patterns:
  If defined in 3+ files:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Extract Shared Type",
      "location": "Multiple files",
      "issue": "${TypeName} interface duplicated across files",
      "recommendation": "Move to /types/shared.ts and import"
    }
```

### Step 6: Conditional Logic Simplification (3 min)

```typescript
// Check 1: Long if/else chains
Grep: "if.*\\{[^}]*\\}\\s*else if.*\\{[^}]*\\}\\s*else if" in **/*.ts **/*.tsx

For each long if/else chain:
  Count: Number of conditions

  If >4 conditions:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Simplify Conditionals",
      "location": "file:line",
      "issue": "Long if/else chain with ${count} conditions",
      "recommendation": "Refactor to:\n  - Switch statement\n  - Strategy pattern\n  - Lookup object\n  - Polymorphism"
    }

// Check 2: Nested ternaries
Grep: "\\?.*:.*\\?.*:" in **/*.tsx

For each nested ternary:
  Read: Expression

  If >2 levels deep:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Simplify Expression",
      "location": "file:line",
      "issue": "Nested ternary operator (hard to read)",
      "recommendation": "Extract to:\n  - Variable assignments\n  - Helper function\n  - Switch statement"
    }

// Check 3: Complex boolean expressions
Grep: "if\\s*\\([^)]{80,}\\)" in **/*.ts **/*.tsx

For each complex condition:
  Add Finding: {
    "severity": "P3",
    "category": "Refactoring - Extract Condition",
    "location": "file:line",
    "issue": "Complex boolean expression (hard to understand)",
    "recommendation": "Extract to well-named boolean variables or predicate function"
  }
```

### Step 7: Missing Abstractions (4 min)

```typescript
// Pattern 1: Repeated Timeline Calculations
Glob: "components/timeline/**/*.tsx" "hooks/use*Timeline*.ts"

Check for repeated calculations:
- Pixel to time conversion
- Time to pixel conversion
- Snap to grid
- Clip collision detection

For each repeated calculation:
  If duplicated 3+ times:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Create Abstraction",
      "location": "Multiple timeline files",
      "issue": "Timeline calculation logic duplicated",
      "recommendation": "Create TimelineCalculator class or utility module"
    }

// Pattern 2: Form Validation
Grep: "if.*\\!.*\\||\\&\\&.*throw" in **/*.ts

Check for validation patterns:
If validation logic repeated:
  Add Finding: {
    "severity": "P2",
    "category": "Refactoring - Create Validator",
    "location": "Multiple files",
    "issue": "Validation logic duplicated across files",
    "recommendation": "Create validation schema or validator functions"
  }

// Pattern 3: Error Handling
Grep: "try.*\\{.*catch.*\\(error\\)" in **/*.ts

Check: Is error handling consistent?
If scattered error handling patterns:
  Add Finding: {
    "severity": "P2",
    "category": "Refactoring - Standardize Error Handling",
    "location": "Multiple files",
    "issue": "Inconsistent error handling patterns",
    "recommendation": "Create error handling middleware or utility"
  }
```

### Step 8: Code Pattern Upgrades (3 min)

```typescript
// Check 1: Old React patterns
Grep: "class.*extends.*React\\.Component" in components/**/*.tsx

If CLASS_COMPONENTS_FOUND:
  Add Finding: {
    "severity": "P2",
    "category": "Refactoring - Modernize Component",
    "location": "file",
    "issue": "Using class component instead of function component",
    "recommendation": "Convert to function component with hooks"
  }

// Check 2: useCallback/useMemo opportunities
Glob: "components/**/*.tsx"

For components:
  Check: Functions defined inside component without useCallback
  Check: Expensive calculations without useMemo

  If SHOULD_MEMOIZE:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Add Memoization",
      "location": "file:line",
      "issue": "Function recreated on every render (performance)",
      "recommendation": "Wrap with useCallback() or useMemo()"
    }

// Check 3: Async/await vs Promises
Grep: "\\.then\\(.*\\)\\.catch\\(" in **/*.ts

For each promise chain:
  If >2 .then() calls:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Use Async/Await",
      "location": "file:line",
      "issue": "Long promise chain (.then() style)",
      "recommendation": "Refactor to async/await for readability"
    }
```

### Step 9: State Management Improvements (3 min)

```typescript
// Check 1: Prop drilling
For large components with many children:
  Check: Are props passed through 3+ levels?

  If PROP_DRILLING:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Fix Prop Drilling",
      "location": "Component tree path",
      "issue": "Props passed through ${levels} component levels",
      "recommendation": "Use React Context or lift state to Zustand store"
    }

// Check 2: Zustand store that should be context
Read: stores/**/*.ts

For each store:
  Check: Is it only used in one component tree?
  Check: Is it truly global state?

  If LOCAL_STATE_IN_GLOBAL_STORE:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Use Local State",
      "location": "file",
      "issue": "Zustand store used for local component state",
      "recommendation": "Move to React Context or component state"
    }

// Check 3: Component state that should be in store
For complex features (timeline, editor):
  Check: Is state managed in component?
  Check: Is it shared across multiple components?

  If SHOULD_BE_IN_STORE:
    Add Finding: {
      "severity": "P2",
      "category": "Refactoring - Lift to Store",
      "location": "file",
      "issue": "Complex shared state managed in component",
      "recommendation": "Move to Zustand store for better separation"
    }
```

### Step 10: Documentation Opportunities (2 min)

```typescript
// Check 1: Complex functions without JSDoc
Glob: "lib/**/*.ts"

For utility and service functions:
  Check: >20 lines or >3 parameters
  Check: Has JSDoc comment?

  If NO_DOCS:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Add Documentation",
      "location": "file:line",
      "issue": "Complex function without JSDoc documentation",
      "recommendation": "Add JSDoc with @param, @returns, @example"
    }

// Check 2: Type aliases without explanation
Grep: "type.*=.*&|type.*=.*\\|" in types/**/*.ts

For complex type aliases:
  Check: Has explanatory comment?

  If NO_EXPLANATION:
    Add Finding: {
      "severity": "P3",
      "category": "Refactoring - Document Type",
      "location": "file:line",
      "issue": "Complex type without explanation",
      "recommendation": "Add comment explaining when/how to use this type"
    }
```

## Output Format

```json
{
  "agentName": "Refactoring Specialist",
  "findings": [
    {
      "severity": "P2",
      "category": "Refactoring - Decompose Component",
      "location": "components/timeline/Timeline.tsx",
      "issue": "Timeline component has 347 lines with 8 state variables and complex rendering logic",
      "recommendation": "Split into:\n  - TimelineContainer (state and logic)\n  - TimelineTrack (sub-component)\n  - TimelineControls (extracted component)\n  - useTimelineState (custom hook)",
      "effort": "2-3 hours",
      "benefit": "Improved maintainability and testability"
    },
    {
      "severity": "P2",
      "category": "Refactoring - Extract Custom Hook",
      "location": "Multiple components (VideoPlayer, AudioWaveform, Timeline)",
      "issue": "Resize listener pattern duplicated in 3 components",
      "recommendation": "Create useResizeObserver() hook in /hooks/",
      "effort": "30 min",
      "benefit": "Reusable across 3+ components"
    },
    {
      "severity": "P2",
      "category": "Refactoring - Create Abstraction",
      "location": "components/timeline/**/*.tsx (5 files)",
      "issue": "Timeline pixel-to-time conversion logic duplicated",
      "recommendation": "Create TimelineCalculator utility class:\n  - pixelToTime()\n  - timeToPixel()\n  - snapToGrid()\n  - detectCollisions()",
      "effort": "1 hour"
    },
    {
      "severity": "P3",
      "category": "Refactoring - Extract Utility",
      "location": "Multiple files (7 locations)",
      "issue": "Duration formatting logic duplicated",
      "recommendation": "Create formatDuration() in /lib/utils/format.ts",
      "effort": "20 min"
    }
  ],
  "summary": {
    "totalOpportunitiesFound": 24,
    "componentDecompositions": 3,
    "hookExtractions": 5,
    "utilityExtractions": 7,
    "typeImprovements": 4,
    "missingAbstractions": 3,
    "codeSimplifications": 2
  },
  "topPriorities": [
    "Decompose Timeline component (347 lines → multiple focused components)",
    "Extract useResizeObserver hook (used in 3 components)",
    "Create TimelineCalculator abstraction (duplicated in 5 files)",
    "Extract to service layer: video generation API calls"
  ],
  "estimatedImpact": {
    "codeReduction": "~400 lines (through extraction and deduplication)",
    "maintainabilityImprovement": "High - better separation of concerns",
    "testabilityImprovement": "High - isolated logic easier to test",
    "performanceImprovement": "Medium - through better memoization"
  }
}
```

## Quality Checklist

Before returning, verify:
- [ ] Identified component decomposition opportunities
- [ ] Found custom hook extraction opportunities
- [ ] Detected utility extraction needs
- [ ] Identified missing abstractions
- [ ] Suggested type improvements
- [ ] All recommendations include effort estimates
- [ ] All recommendations include expected benefits
- [ ] Prioritized by impact and effort

## Critical Notes

1. **Focus on high-value refactoring** - not every tiny improvement
2. **Consider effort vs benefit** - suggest wins first
3. **Provide specific recommendations** - not just "this is complex"
4. **Estimate time realistically** - include testing time
5. **Group related refactorings** - extract utilities together
6. **Don't suggest breaking changes** - unless high value
7. **Consider existing patterns** - align with codebase style
