# Code Validator Skill

A Claude Code skill that automatically validates code changes for accuracy, best practices compliance, duplication, and successful Vercel builds.

## What This Skill Does

After any code update, this skill:

1. **Reviews accuracy** - Verifies implementation matches requirements
2. **Checks best practices** - Ensures code follows repository standards
3. **Detects duplication** - Identifies redundant code patterns
4. **Validates builds** - Confirms Vercel deployment succeeds
5. **Fixes recursively** - Continues until all checks pass

## Installation

This is a **project skill** - it's automatically available when working in this repository.

### Manual Installation (if needed)

1. Ensure `.claude/skills/code-validator/` exists in your project
2. The skill is automatically loaded by Claude Code
3. No additional setup required

## Usage

The skill activates automatically when you:

- Complete code changes and ask for validation
- Use keywords like "validate", "check", "review", or "verify"
- Request build confirmation
- Ask to check best practices

### Example Commands

```
"Validate my changes"
"Check if everything follows best practices"
"Make sure the build works"
"Review my code for issues"
"Verify the implementation is correct"
```

## How It Works

### Automatic Invocation

Claude automatically loads this skill when the task description matches validation, verification, or code review tasks.

### Validation Process

1. **Parallel Analysis** - Spawns sub-agent to review changes
2. **Best Practices Check** - Validates against CODING_BEST_PRACTICES.md
3. **Duplication Detection** - Searches for redundant code
4. **Build Verification** - Monitors Vercel deployment
5. **Recursive Fixes** - Applies fixes and re-validates until clean

### Output

Provides a comprehensive report:

- ✅/❌ Status for each check
- List of issues found
- Actions taken to fix
- Build status and logs
- Next steps (if any)

## Configuration

### Max Iterations

Default: 5 iterations before stopping

To modify, edit `Skill.md` and change:

```python
max_iterations = 5  # Change to desired value
```

### Validation Scope

Control what gets validated by specifying in your request:

- "Just check best practices" - Skips other checks
- "Full validation" - Runs all checks
- "Quick validation" - Skips build check

## Best Practices Checked

### TypeScript

- No `any` types
- Branded types for IDs
- Function return types specified
- Strict mode compliance

### API Routes

- Uses `withAuth` middleware
- Proper AuthOptions format
- Input validation
- Rate limiting applied
- Service layer for logic

### React Components

- `'use client'` directive placement
- ForwardRef usage
- Proper hook ordering
- Memoization for performance

### General

- DRY principle
- Error handling
- Code formatting
- ESLint compliance
- Test coverage

## Examples

### Example 1: After Adding API Route

```
You: "I just added a new API route for user profiles. Please validate it."

Claude: [Loads code-validator skill]
🔍 Validating code changes...

✅ Accuracy Review: Implementation correct
⚠️  Best Practices: Missing input validation
✅ Duplication: No duplicates found
⏳ Build Status: Triggering Vercel deployment...

[Applies fix for input validation]

✅ Build Status: Deployment successful
✅ All validation checks passed!
```

### Example 2: Recursive Fixes

```
You: "Validate my changes and fix everything automatically"

Claude: [Loads code-validator skill]
🔍 Starting validation (Iteration 1/5)...

Found issues:
- 3 instances of 'any' type
- Missing withAuth middleware
- Duplicate helper function
- Build failed: TypeScript error

[Applies fixes...]

🔍 Starting validation (Iteration 2/5)...

Found issues:
- Build warning: unused import

[Applies fix...]

🔍 Starting validation (Iteration 3/5)...

✅ All checks passed!
✅ Vercel build: Ready
```

## Troubleshooting

### Skill Not Loading

**Problem:** Claude doesn't use the skill automatically

**Solution:**

- Use explicit keywords: "validate", "check", "verify"
- Ensure `.claude/skills/code-validator/` exists
- Check that Skill.md has proper YAML frontmatter

### Build Timeouts

**Problem:** Local build times out

**Solution:**

- Skill automatically uses Vercel CLI instead
- Monitors remote build status
- Waits up to 60 seconds for completion

### False Positives

**Problem:** Skill flags acceptable code as duplicative

**Solution:**

- Review the context
- Some duplication is acceptable (constants, types)
- Use `// @skill-validator-ignore` comment to skip specific lines

## Advanced Usage

### Custom Validation Rules

Add repository-specific rules to Skill.md:

```markdown
## Custom Rules

- Database queries must use parameterized statements
- All API routes must have JSDoc comments
- Components must be under 300 lines
```

### Integration with CI/CD

This skill complements (doesn't replace) automated CI:

- **Skill:** Interactive, iterative fixes during development
- **CI/CD:** Final gate before merge

### Extending the Skill

To add new validation checks:

1. Edit `Skill.md`
2. Add new check to validation process
3. Update validation checklist
4. Increment version number

## Performance

- **Parallel validation:** Runs multiple checks concurrently
- **Incremental checks:** Validates only changed files when possible
- **Smart caching:** Reuses previous results when applicable
- **Average runtime:** 30-90 seconds for full validation

## Limitations

- **Max iterations:** Stops after 5 attempts to prevent loops
- **Build timeout:** May timeout on very large builds
- **Manual review:** Some issues require human judgment
- **Rate limits:** Vercel deployments are rate-limited

## File Structure

```
.claude/skills/code-validator/
├── Skill.md           # Main skill definition (YAML + instructions)
├── REFERENCE.md       # Command reference and troubleshooting
└── README.md          # This file
```

## Version History

- **1.0.0** (2025-10-24) - Initial release
  - Automatic accuracy review
  - Best practices validation
  - Duplication detection
  - Vercel build monitoring
  - Recursive fix loops

## Resources

- [Claude Skills Documentation](https://docs.claude.com/en/docs/claude-code/skills)
- [Repository Best Practices](/docs/CODING_BEST_PRACTICES.md)
- [Style Guide](/docs/STYLE_GUIDE.md)
- [Testing Guide](/docs/TESTING.md)

## Support

For issues or improvements:

1. Check REFERENCE.md for troubleshooting
2. Review Skill.md for configuration options
3. Update the skill and increment version number

---

**Maintained by:** Repository maintainers
**Last Updated:** 2025-10-24
**License:** Follows repository license
