# Automated Code Fixes

This document describes automated tooling for fixing common code quality issues in the codebase.

## Return Type Fixer

The Return Type Fixer is an automated tool that adds explicit TypeScript return types to functions that are missing them. This addresses Issue #4 in the project's issue tracker.

### What It Does

The script uses `ts-morph` to parse the TypeScript Abstract Syntax Tree (AST) and:

1. Scans specified directories for TypeScript files
2. Identifies functions without explicit return types
3. Infers the return type using TypeScript's type checker
4. Adds the explicit return type annotation to the function

### What It Fixes

The script handles:

- Function declarations
- Arrow functions
- Function expressions
- Method declarations
- Async functions (automatically wraps in `Promise<T>`)

### What It Doesn't Fix

The script intentionally skips:

- Functions that already have return types
- Type predicates and type guards (functions with `is` or `asserts`)
- Constructors
- Abstract methods without implementation
- Test files (files in `__tests__`, `*.test.ts`, `*.spec.ts`)
- Functions where return type cannot be reliably inferred
- Functions with overly complex return types (>500 characters)

### Target Directories

By default, the script processes files in:

- `/lib/` - Core library code
- `/components/` - React components
- `/app/api/` - API routes
- `/state/` - State management

### Usage

#### Dry Run (Recommended First)

Run the script in dry-run mode to see what changes would be made without modifying any files:

```bash
npm run fix-return-types:dry
```

This will:
- Scan all target files
- Show which functions would be fixed
- Display a summary report
- **Not modify any files**

#### Live Execution

To apply the fixes:

```bash
npm run fix-return-types
```

This will:
- Scan all target files
- Add return types to functions
- Save the modified files
- Display a summary report

#### Verbose Mode

For detailed output showing each file and function being processed:

```bash
npm run fix-return-types:verbose
```

You can combine flags:
```bash
tsx scripts/add-return-types.ts --dry-run --verbose
```

### Command Line Options

- `--dry-run`, `-d` - Preview changes without modifying files
- `--backup`, `-b` - Create `.backup` files before modifying (recommended)
- `--verbose`, `-v` - Show detailed progress for each file

### Safety Measures

1. **Dry Run Mode**: Always test with `--dry-run` first to preview changes

2. **Backup Files**: Use `--backup` flag to create backup copies:
   ```bash
   tsx scripts/add-return-types.ts --backup
   ```

3. **Git Version Control**: Commit your changes before running:
   ```bash
   git add .
   git commit -m "chore: prepare for return type fixes"
   ```

4. **Incremental Testing**: Test on a subset of files first by temporarily modifying `TARGET_DIRECTORIES` in the script

5. **TypeScript Validation**: Run type checking after applying fixes:
   ```bash
   npm run type-check
   ```

6. **Test Suite**: Run tests to ensure no regressions:
   ```bash
   npm test
   ```

### Workflow

Recommended workflow for applying fixes:

```bash
# 1. Ensure clean git state
git status

# 2. Run dry-run to preview changes
npm run fix-return-types:dry

# 3. Review the summary and top modified files

# 4. Apply fixes (with backup)
tsx scripts/add-return-types.ts --backup

# 5. Verify TypeScript compilation
npm run type-check

# 6. Run tests
npm test

# 7. Review changes
git diff

# 8. Commit if successful
git add .
git commit -m "fix: add explicit return types to 367+ functions"

# 9. Build the project
npm run build

# 10. Push to remote
git push
```

### Output Report

The script provides a detailed summary:

```
============================================================
📊 Summary Report
============================================================
Mode:                 LIVE
Files Processed:      142
Files Modified:       85
Functions Fixed:      367
Files with Errors:    3
Processing Time:      12.34s
============================================================

📝 Top Modified Files:
   45 functions - lib/services/asset-service.ts
   32 functions - components/Timeline.tsx
   28 functions - state/timeline-store.ts
   ...
```

### Troubleshooting

#### Issue: Script fails with "Cannot find module"

**Solution**: Install dependencies:
```bash
npm install
```

#### Issue: "Type inference failed" errors

**Cause**: Some functions have complex types that TypeScript cannot reliably infer.

**Solution**: These functions are automatically skipped. You can manually add return types to them.

#### Issue: Build fails after applying fixes

**Solution**:
1. Check TypeScript errors: `npm run type-check`
2. Review the git diff to see what changed
3. Revert specific files if needed: `git checkout -- path/to/file.ts`
4. Manually fix the problematic return types

#### Issue: Tests fail after applying fixes

**Cause**: Rarely, explicit return types can expose latent type issues.

**Solution**:
1. Run tests: `npm test`
2. Check test output for specific failures
3. Fix the underlying type issues (the script revealed problems that already existed)

#### Issue: Changes not being saved

**Cause**: Running in dry-run mode.

**Solution**: Remove the `--dry-run` flag.

### Performance

- Typical processing time: 10-20 seconds for the entire codebase
- Memory usage: ~500MB-1GB
- Handles large projects with 100+ files efficiently

### Script Location

The script is located at:
```
/scripts/add-return-types.ts
```

### Dependencies

Required packages (already installed in devDependencies):
- `ts-morph` - TypeScript compiler API wrapper
- `tsx` - TypeScript executor

### Extending the Script

To process additional directories, edit the `TARGET_DIRECTORIES` array in the script:

```typescript
const TARGET_DIRECTORIES = [
  'lib',
  'components',
  'app/api',
  'state',
  'your-new-directory', // Add here
];
```

To add exclusion patterns, edit the `EXCLUDE_PATTERNS` array:

```typescript
const EXCLUDE_PATTERNS = [
  '__tests__',
  '*.test.ts',
  '*.test.tsx',
  '*.spec.ts',
  '*.spec.tsx',
  '.next',
  'node_modules',
  'your-pattern', // Add here
];
```

### Related Issues

- **Issue #4**: Missing TypeScript Return Types (367+ in production code)
  - Status: Fixed by this tool
  - Priority: P1

### Additional Resources

- [ts-morph Documentation](https://ts-morph.com/)
- [TypeScript Handbook: Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [Project Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)

### Maintenance

After running the script, consider:

1. Updating ESLint rules to enforce return types:
   ```typescript
   // eslint.config.mjs
   rules: {
     '@typescript-eslint/explicit-function-return-type': 'error',
   }
   ```

2. Adding a pre-commit hook to prevent new violations:
   ```bash
   # .husky/pre-commit
   npm run type-check
   ```

3. Setting up continuous integration checks

### Support

If you encounter issues with the automated fixer:

1. Check this documentation for troubleshooting steps
2. Review the script output for specific error messages
3. Run in verbose mode for detailed debugging information
4. Check the git diff to understand what changes were made
5. Revert problematic changes and fix manually if needed

### Version History

- **v1.0.0** (2025-10-24) - Initial release
  - Supports function declarations, expressions, and methods
  - Dry-run and backup modes
  - Comprehensive error handling
  - Progress indicators and detailed reporting
