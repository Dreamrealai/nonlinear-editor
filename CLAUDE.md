# Project Memory

## Git Workflow

**IMPORTANT**: After every code update or change:

1. **Build the project** - Always run the build command to ensure the code compiles without errors
2. **Commit changes** - Create a git commit with a descriptive message
3. **Push to remote** - Push the changes to the git remote repository

### Automated Workflow

When making changes to this project:

1. Run `npm run build` to build the Next.js application with Turbopack
2. Verify the build succeeds without errors
3. Stage changes with `git add .`
4. Create a commit: `git commit -m "descriptive message"`
5. Push to remote: `git push`

This ensures all changes are properly built, tested, and version controlled before being pushed to the repository.

## Coding Best Practices Summary

**MUST READ**: Comprehensive documentation available in `/docs/`

### Key Practices

**TypeScript:**

- Use branded types for IDs: `UserId`, `ProjectId`, `AssetId`
- Use discriminated unions for error handling
- Use assertion functions for type guards
- Avoid `any` - use `unknown` or generics
- Always specify function return types

**React Components:**

- Use `forwardRef` for reusable components
- Extract logic into custom hooks
- Follow hooks order: context → state → refs → effects → custom
- Use memoization for expensive computations

**State Management (Zustand):**

- Separate stores by domain (timeline, playback, selection)
- Use Immer middleware for immutable updates
- Use selectors for derived state
- Keep actions focused and atomic

**API Routes:**

- Always use `withAuth` middleware
- Apply appropriate rate limiting tier
- Validate all inputs with assertion functions
- Use service layer for business logic
- Return standardized error responses

**Service Layer:**

- Implement in `/lib/services/`
- Accept dependencies via constructor (dependency injection)
- Handle errors and track them
- Implement caching where appropriate
- Invalidate cache after mutations

**Error Handling:**

- Use custom error classes (ValidationError, DatabaseError)
- Track errors with context
- Provide user-friendly messages
- Implement graceful fallbacks

**Security:**

- Validate all inputs (never trust client data)
- Use Row Level Security (RLS) in database
- Verify ownership before operations
- Apply rate limiting by operation cost
- Sanitize user-generated content

**Testing:**

- Follow AAA pattern (Arrange-Act-Assert)
- Use helper functions for common setups
- Write descriptive test names
- Test edge cases and error paths

**Code Organization:**

- Follow naming conventions (camelCase, PascalCase, SCREAMING_SNAKE_CASE)
- Organize imports (React → third-party → absolute → relative → types)
- Use consistent file naming
- Keep files focused and cohesive

### Quick Reference Documentation

- **[Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)** - Comprehensive patterns with examples
- **[Style Guide](/docs/STYLE_GUIDE.md)** - Code formatting and conventions
- **[Architecture Overview](/docs/ARCHITECTURE_OVERVIEW.md)** - System design and patterns
- **[Service Layer Guide](/docs/SERVICE_LAYER_GUIDE.md)** - Business logic patterns
- **[API Documentation](/docs/api/)** - API endpoints and contracts

### Before Committing Code

Checklist:

- [ ] TypeScript strict mode passes (no `any`)
- [ ] Branded types used for IDs
- [ ] API routes use `withAuth` middleware
- [ ] Errors handled with `errorResponse` helpers
- [ ] Input validation with assertion functions
- [ ] Service layer used for business logic
- [ ] Tests follow AAA pattern
- [ ] Code formatted with Prettier
- [ ] No ESLint warnings
- [ ] Documentation updated

## Test Credentials

**IMPORTANT**: These credentials are for testing purposes only.

- Email: test@example.com
- Password: test_password_123
