# Code Validator Skill - Quick Start

## 🚀 Instant Usage

### Activate the Skill

Just ask Claude to validate your code:

```
"Validate my changes"
```

That's it! The skill loads automatically.

## 📋 Common Commands

### After Making Changes

```
"Validate my code changes"
"Check if everything is correct"
"Make sure the build works"
```

### Specific Checks

```
"Check best practices only"
"Look for duplicate code"
"Verify the Vercel build"
"Review for TypeScript errors"
```

### Automated Fixes

```
"Validate and fix all issues"
"Run validation until everything passes"
```

## ✅ What Gets Checked

1. **Code Accuracy** - Does it work correctly?
2. **Best Practices** - Follows CODING_BEST_PRACTICES.md?
3. **No Duplication** - DRY principle applied?
4. **Build Success** - Vercel deployment works?

## 🎯 Expected Output

```
🔍 Validating code changes...

✅ Accuracy Review: Implementation correct
✅ Best Practices: All checks passed
✅ Duplication: No duplicates found
✅ Build Status: Ready

✅ All validation checks passed!
```

## 🔧 Manual Validation Script

Run standalone validation:

```bash
./.claude/skills/code-validator/scripts/validate.sh
```

## 📖 More Info

- **Full docs:** See README.md in this directory
- **Reference:** See REFERENCE.md for commands
- **Examples:** See Skill.md for detailed examples

## ⚡ Pro Tips

1. **Validate often** - After every significant change
2. **Let it auto-fix** - Say "fix all issues automatically"
3. **Be specific** - "Check API routes only" for targeted validation
4. **Use pre-commit** - Hook calls this skill before commits

## 🐛 Troubleshooting

**Skill not loading?**

- Use keywords: "validate", "check", "verify"

**Taking too long?**

- Say "quick validation" to skip build check

**Need help?**

- See REFERENCE.md for detailed troubleshooting

---

**Version:** 1.0.0 | **Updated:** 2025-10-24
