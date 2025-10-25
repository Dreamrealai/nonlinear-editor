---
name: 'Code Validator'
description: 'Automatically validates code changes for accuracy, best practices, duplication, and successful Vercel builds after code updates'
version: '1.0.0'
dependencies:
  - 'node>=18.0.0'
  - 'vercel-cli>=latest'
---

# Code Validator Skill

## Purpose

This skill automatically validates all code changes after updates to ensure:

1. Changes are accurate and implement requirements correctly
2. Code follows repository best practices defined in CLAUDE.md and docs/
3. No duplicative code is introduced
4. Vercel build completes successfully
5. All issues are recursively fixed until validation passes

## When to Use

**Trigger automatically after:**

- Completing any code changes
- Committing code updates
- Before pushing to GitHub
- User requests validation or review

**Keywords that invoke this skill:**

- "validate the changes"
- "check if everything is correct"
- "review my code"
- "make sure the build works"
- "verify the implementation"

## Validation Process

### Step 1: Code Accuracy Review

**Task:** Spawn a parallel agent to review recent changes

```markdown
Use the Task tool with subagent_type="general-purpose" to launch a validation agent:

Prompt: "Review the most recent code changes and verify:

1. Implementation matches stated requirements
2. All edge cases are handled
3. Error handling is comprehensive
4. No logic errors or bugs introduced
5. Return a detailed report of any issues found"
```

### Step 2: Best Practices Check

**Reference:** Check against repository coding standards

**Validation Checklist:**

From `/docs/CODING_BEST_PRACTICES.md`:

- [ ] TypeScript strict mode compliance (no `any` types)
- [ ] Branded types used for IDs (UserId, ProjectId, etc.)
- [ ] API routes use `withAuth` middleware with proper AuthOptions format
- [ ] Error handling uses custom error classes
- [ ] Input validation with assertion functions
- [ ] Service layer used for business logic (not in API routes)
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Proper naming conventions (camelCase, PascalCase, SCREAMING_SNAKE_CASE)
- [ ] Imports organized (React → third-party → absolute → relative → types)

From `/CLAUDE.md`:

- [ ] No `any` types in TypeScript
- [ ] Function return types specified
- [ ] `forwardRef` used for reusable components
- [ ] Row Level Security (RLS) verified for database operations
- [ ] Rate limiting applied by operation cost
- [ ] User input sanitized
- [ ] Documentation updated

**How to check:**

```bash
# Run TypeScript check
npx tsc --noEmit

# Check for 'any' types
grep -r "any" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next"

# Run ESLint
npm run lint
```

### Step 3: Duplication Detection

**Task:** Check for code duplication

**Process:**

1. Use Grep to search for similar function names or logic patterns
2. Compare new code against existing implementations
3. Check if utilities/helpers could be reused instead
4. Verify DRY principle adherence

**Common duplication patterns to check:**

- API route handlers with similar logic
- React hooks with similar functionality
- Validation functions
- Error handling blocks
- Type definitions

### Step 4: Vercel Build Verification

**Task:** Verify build completes successfully

**Process:**

```bash
# Option 1: Local build (faster, may timeout for large projects)
npm run build

# Option 2: Trigger Vercel deployment and monitor
vercel --yes --prod

# Check deployment status
vercel ls --yes | head -25

# Wait for build completion (30-60 seconds)
sleep 45 && vercel ls --yes | head -10
```

**Success Criteria:**

- Build status shows "● Ready" (not "● Error" or "● Building")
- No TypeScript compilation errors
- No build-time errors
- All pages/routes compile successfully

**If build fails:**

1. Capture error logs: `vercel logs <deployment-url>`
2. Identify the specific error
3. Fix the issue
4. Re-run validation from Step 1

### Step 5: Recursive Fix Loop

**Task:** Continue validation and fixes until all checks pass

**Algorithm:**

```python
max_iterations = 5
iteration = 0
all_checks_passed = False

while not all_checks_passed and iteration < max_iterations:
    iteration += 1

    # Run all validation steps
    accuracy_issues = check_accuracy()
    best_practice_violations = check_best_practices()
    duplications = check_duplication()
    build_status = check_vercel_build()

    # Collect all issues
    all_issues = accuracy_issues + best_practice_violations + duplications

    if not all_issues and build_status == "Ready":
        all_checks_passed = True
        break

    # Fix issues
    for issue in all_issues:
        apply_fix(issue)

    # Commit fixes
    git_commit(f"Validation fixes - iteration {iteration}")

    # Wait for build
    wait_for_build_completion()

if all_checks_passed:
    return "✅ All validation checks passed!"
else:
    return f"⚠️ Max iterations reached. {len(all_issues)} issues remain."
```

## Output Format

Provide a comprehensive validation report:

```markdown
# Code Validation Report

**Status:** [✅ PASSED | ⚠️ ISSUES FOUND | ❌ FAILED]
**Timestamp:** [ISO 8601 timestamp]
**Iterations:** [number of fix iterations]

## Accuracy Review

- [✅/❌] Implementation matches requirements
- [✅/❌] Edge cases handled
- [✅/❌] Error handling comprehensive
- **Issues:** [list any found]

## Best Practices Compliance

- [✅/❌] TypeScript strict mode
- [✅/❌] Branded types for IDs
- [✅/❌] API middleware usage
- [✅/❌] Service layer pattern
- [✅/❌] Test coverage
- **Violations:** [list any found]

## Duplication Check

- [✅/❌] No duplicate logic
- [✅/❌] DRY principle followed
- **Duplications:** [list any found]

## Vercel Build

- **Status:** [Ready/Error/Building]
- **Duration:** [build time]
- **Errors:** [list any errors]

## Actions Taken

1. [List each fix applied]
2. [...]

## Next Steps

[Any remaining manual interventions needed]
```

## Advanced Features

### Parallel Validation

Run multiple checks concurrently for speed:

```markdown
Launch 3 parallel agents:

1. Agent 1: Accuracy + Best Practices review
2. Agent 2: Duplication detection
3. Agent 3: Vercel build monitoring

Consolidate results when all complete.
```

### Incremental Validation

For large changesets, validate incrementally:

- Check only modified files first
- If issues found, expand to related files
- Full validation on final iteration

### Pre-commit Hook Integration

Suggest adding to `.husky/pre-commit`:

```bash
# Run validation before allowing commit
npm run validate-changes || exit 1
```

## Limitations

- **Build Timeout:** Local builds may timeout on large projects (use Vercel CLI instead)
- **Max Iterations:** Prevents infinite loops (default: 5)
- **Manual Review:** Some issues may require human judgment
- **Rate Limits:** Vercel deployments are rate-limited

## Examples

### Example 1: Simple Validation

**Input:**

```
User: "I just added a new API route. Please validate it."
```

**Process:**

1. Launch parallel agent to review the new route
2. Check withAuth middleware usage
3. Verify rate limiting applied
4. Check for similar existing routes
5. Trigger Vercel build
6. Report results

### Example 2: Iterative Fixes

**Input:**

```
User: "Validate my changes and fix any issues"
```

**Process:**

1. Initial validation finds:
   - Missing input validation
   - Using `any` type in 3 places
   - Duplicate helper function
   - Build fails with type error

2. Iteration 1: Fix type errors and validation
   - Replace `any` with proper types
   - Add input validation
   - Build succeeds but ESLint warnings

3. Iteration 2: Fix ESLint warnings
   - Fix unused imports
   - Apply consistent formatting

4. Final validation: All checks pass ✅

### Example 3: Best Practices Check Only

**Input:**

```
User: "Check if my code follows the style guide"
```

**Process:**

1. Skip accuracy review
2. Focus on CODING_BEST_PRACTICES.md compliance
3. Check CLAUDE.md checklist
4. Report violations only

## Integration with Existing Workflows

This skill works alongside:

- **Git workflow** defined in CLAUDE.md
- **Pre-commit hooks** (husky, lint-staged)
- **CI/CD pipeline** (GitHub Actions)
- **Vercel deployments**

## Updates and Maintenance

**Version History:**

- 1.0.0 (2025-10-24): Initial release

**To update this skill:**

1. Modify Skill.md
2. Increment version number
3. Test with sample code changes
4. Commit to repository

## References

- `/CLAUDE.md` - Repository coding guidelines
- `/docs/CODING_BEST_PRACTICES.md` - Comprehensive best practices
- `/docs/STYLE_GUIDE.md` - Code style conventions
- `/docs/TESTING.md` - Testing standards
