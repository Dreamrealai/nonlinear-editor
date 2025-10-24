# Bundle Size Optimization Plan

## Current State

- **Current bundle size**: 519 MB (.next directory)
- **node_modules size**: 839 MB
- **Target**: Reduce to < 200 MB

## Analysis Summary

### Largest Dependencies (node_modules)

1. **next + @next**: 276 MB (155M + 121M) - Core framework, cannot reduce
2. **@swagger-api + swagger-ui-react**: 78.2 MB (71M + 7.2M) - **MAJOR OPPORTUNITY**
3. **lucide-react**: 43 MB - **OPTIMIZATION OPPORTUNITY**
4. **@swc**: 34 MB - Required for Next.js
5. **typescript**: 23 MB - Dev dependency
6. **@google-cloud**: 14 MB - Used only in specific API routes

### Unused Dependencies (to remove)

- `@fal-ai/client` - Not imported anywhere in code
- `@stripe/stripe-js` - Only listed in optimizePackageImports, not actually used

### Optimization Strategies

## 1. Remove Swagger UI (HIGH IMPACT - ~78 MB savings)

**Action**: Replace swagger-ui-react with a lightweight alternative or custom API docs

- swagger-ui-react: 7.2 MB
- @swagger-api dependencies: 71 MB
- react-syntax-highlighter: 8.7 MB
- Total savings: ~87 MB

**Options**:
a) Replace with Scalar (lightweight alternative ~2 MB)
b) Create custom API documentation with code syntax highlighting
c) Serve swagger-ui from CDN instead of bundling

**Recommendation**: Option A - Use Scalar API reference

## 2. Optimize Lucide React Icons (MEDIUM IMPACT - ~35 MB savings)

**Action**: Use modularizeImports to tree-shake unused icons

- Current: 43 MB
- Expected after optimization: ~8 MB
- Savings: ~35 MB

**Implementation**:

```typescript
// next.config.ts
modularizeImports: {
  'lucide-react': {
    transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
  },
}
```

## 3. Google Cloud Packages (LOW-MEDIUM IMPACT - Keep but optimize)

**Action**: These are only used in specific API routes (server-side)

- @google-cloud/storage: Used in video analysis
- @google-cloud/vertexai: Used in Gemini chat
- @google-cloud/video-intelligence: Used in scene detection
- @google/generative-ai: Used in AI features

**No action needed** - These don't contribute to client bundle

## 4. Next.js Configuration Optimizations

**Actions**:

- Enable `swcMinify: true` (if not already)
- Add `output: 'standalone'` for production
- Ensure `productionBrowserSourceMaps: false`
- Add `optimizeFonts: true`

## 5. Webpack/Bundle Configuration

**Actions**:

- Configure splitChunks for better code splitting
- Enable tree shaking for all dependencies
- Use SWC instead of Babel (already configured)

## 6. Additional Dynamic Imports

**Actions**:

- Swagger UI page (already dynamic)
- Admin page components
- Large forms and modals

## Implementation Priority

### Phase 1 (Quick Wins - ~40 MB savings)

1. ✅ Remove unused dependencies (@fal-ai/client, @stripe/stripe-js)
2. ✅ Add modularizeImports for lucide-react
3. ✅ Optimize Next.js config

### Phase 2 (Major Impact - ~80 MB savings)

1. Replace swagger-ui-react with Scalar or lightweight alternative
2. Verify dynamic imports are working correctly

### Phase 3 (Fine-tuning)

1. Analyze remaining chunks
2. Add more granular code splitting
3. Optimize CSS bundle

## Expected Results

| Optimization              | Size Reduction | Effort     |
| ------------------------- | -------------- | ---------- |
| Remove unused deps        | ~5 MB          | Low        |
| Lucide-react optimization | ~35 MB         | Low        |
| Replace Swagger UI        | ~80 MB         | Medium     |
| Next.js config            | ~10 MB         | Low        |
| **Total Expected**        | **~130 MB**    | **Medium** |

**Expected Final Size**: ~390 MB (from 519 MB)
**Additional optimization potential**: ~50-100 MB with further analysis

## Rollback Plan

All changes will be committed separately, allowing easy rollback if issues occur.
