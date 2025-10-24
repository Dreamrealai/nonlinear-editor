# Contributing to Non-Linear Video Editor

Thank you for your interest in contributing to this project! We welcome contributions from the community and appreciate your help in making this video editor better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Review Process](#code-review-process)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Style Guidelines](#style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Need Help?](#need-help)

## Code of Conduct

### Our Standards

We are committed to providing a welcoming and inclusive environment for everyone. We expect all contributors to:

- Be respectful and constructive in discussions
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism gracefully

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting/derogatory comments, or personal attacks
- Publishing others' private information without permission
- Any conduct that would be considered inappropriate in a professional setting

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** and npm installed
- **Git** for version control
- **A Supabase account** (free tier is fine)
- Basic familiarity with TypeScript, React, and Next.js

### First-Time Contributors

If this is your first contribution:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nonlinear-editor.git
   cd nonlinear-editor
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Dreamrealai/nonlinear-editor.git
   ```
4. **Follow the development setup** below

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials (see [SUPABASE_SETUP.md](docs/setup/SUPABASE_SETUP.md) for details).

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 4. Verify Your Setup

```bash
# Run tests
npm test

# Check TypeScript
npm run type-check

# Check linting
npm run lint

# Run all checks
npm run validate
```

## Making Changes

### Branch Naming Convention

Create a descriptive branch name using this format:

- **Features**: `feature/short-description` (e.g., `feature/add-audio-filters`)
- **Bug fixes**: `fix/short-description` (e.g., `fix/timeline-playback-error`)
- **Documentation**: `docs/short-description` (e.g., `docs/update-api-guide`)
- **Refactoring**: `refactor/short-description` (e.g., `refactor/timeline-state`)
- **Tests**: `test/short-description` (e.g., `test/add-export-tests`)

### Creating a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create and switch to your feature branch
git checkout -b feature/your-feature-name
```

### Development Workflow

1. **Make your changes** following our [coding best practices](docs/CODING_BEST_PRACTICES.md)
2. **Test your changes** thoroughly
3. **Run validation** before committing:
   ```bash
   npm run validate
   npm run build
   npm test
   ```
4. **Commit your changes** with a descriptive message
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Review Process

### What to Expect

1. **Initial Review**: A maintainer will review your PR within 2-3 business days
2. **Feedback**: You may receive feedback requesting changes
3. **Iteration**: Make requested changes and push new commits
4. **Approval**: Once approved, a maintainer will merge your PR

### Review Criteria

Your PR will be reviewed for:

- **Functionality**: Does it work as intended?
- **Code Quality**: Is it clean, readable, and maintainable?
- **Testing**: Are there adequate tests?
- **Documentation**: Is documentation updated?
- **Style**: Does it follow our style guidelines?
- **Performance**: Does it introduce performance issues?
- **Security**: Are there any security concerns?

## Testing Requirements

### Minimum Test Coverage

All contributions must include appropriate tests:

- **New Features**: 80%+ test coverage
- **Bug Fixes**: Add test case that would have caught the bug
- **Refactoring**: Maintain or improve existing test coverage

### Writing Tests

We use Jest and React Testing Library. See our [Testing Guide](docs/TESTING.md) for details.

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Requirements by Type

**API Routes**:
- Test all success paths
- Test error handling
- Test authentication/authorization
- Test input validation

**Components**:
- Test rendering
- Test user interactions
- Test edge cases
- Test accessibility

**Services**:
- Test business logic
- Test error handling
- Test edge cases
- Test caching behavior

## Documentation Requirements

### When Documentation is Required

Update documentation when:

- Adding new features
- Changing API endpoints
- Modifying configuration
- Changing environment variables
- Updating dependencies
- Fixing significant bugs

### Documentation Files to Update

- **README.md**: For major features or setup changes
- **API Documentation**: For API changes ([docs/api/](docs/api/))
- **Architecture Docs**: For architectural changes ([docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md))
- **Code Comments**: For complex logic
- **Inline JSDoc**: For public functions and components

## Style Guidelines

### Code Style

We follow strict TypeScript and React best practices. Key points:

**TypeScript**:
- Use strict mode (no `any`)
- Use branded types for IDs (`UserId`, `ProjectId`, etc.)
- Always specify function return types
- Use discriminated unions for error handling

**React**:
- Use functional components with hooks
- Use `forwardRef` for reusable components
- Extract logic into custom hooks
- Follow hooks order: context → state → refs → effects → custom

**Naming Conventions**:
- **Components**: PascalCase (e.g., `VideoPlayer.tsx`)
- **Files**: kebab-case for utilities (e.g., `format-time.ts`)
- **Functions**: camelCase (e.g., `handleClick`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

**Import Order**:
1. React imports
2. Third-party imports
3. Absolute imports (from `/app`, `/lib`, `/components`)
4. Relative imports
5. Type imports

See [STYLE_GUIDE.md](docs/STYLE_GUIDE.md) and [CODING_BEST_PRACTICES.md](docs/CODING_BEST_PRACTICES.md) for comprehensive guidelines.

### Code Formatting

We use Prettier and ESLint:

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Pre-commit Hooks

We use Husky and lint-staged. Before each commit, your code will be:
- Formatted with Prettier
- Linted with ESLint
- Type-checked with TypeScript

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Scope

Optional. Examples: `timeline`, `api`, `auth`, `export`

### Subject

- Use imperative mood ("Add feature" not "Added feature")
- Don't capitalize first letter
- No period at the end
- Keep under 72 characters

### Examples

```bash
# Good
git commit -m "feat(timeline): add drag and drop for clips"
git commit -m "fix(export): resolve memory leak in video encoding"
git commit -m "docs(api): update authentication examples"

# Bad
git commit -m "Fixed stuff"
git commit -m "WIP"
git commit -m "Updated files"
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest main:
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks**:
   ```bash
   npm run validate
   npm run build
   npm test
   ```

3. **Update documentation** if needed

4. **Write a clear PR description** (see template below)

### PR Title Format

Use the same format as commit messages:

```
<type>(<scope>): <description>
```

Examples:
- `feat(timeline): add clip snapping functionality`
- `fix(export): resolve audio sync issues`
- `docs(setup): clarify Supabase configuration steps`

### PR Description Template

```markdown
## Description
Brief description of what this PR does and why.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
```

### After Submitting

- **Respond to feedback** promptly
- **Make requested changes** in new commits
- **Keep your PR up to date** with main branch
- **Don't force push** after review has started (unless specifically requested)

## Need Help?

### Resources

- **Documentation**: [docs/](docs/) directory
- **Coding Best Practices**: [docs/CODING_BEST_PRACTICES.md](docs/CODING_BEST_PRACTICES.md)
- **Architecture Guide**: [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md)
- **API Reference**: [docs/api/](docs/api/)
- **Testing Guide**: [docs/TESTING.md](docs/TESTING.md)

### Getting Help

- **GitHub Discussions**: Ask questions in GitHub Discussions
- **GitHub Issues**: For bug reports and feature requests
- **Code Review**: Ask questions in PR comments

### Common Issues

**Build Errors**:
```bash
# Clear cache and rebuild
rm -rf node_modules .next
npm install
npm run build
```

**Test Failures**:
```bash
# Run specific test
npm test -- path/to/test.ts

# Debug tests
npm run test:watch
```

**Type Errors**:
```bash
# Check TypeScript
npm run type-check
```

**Supabase Issues**:
See [SUPABASE_SETUP.md](docs/setup/SUPABASE_SETUP.md) for troubleshooting.

## Recognition

Contributors will be recognized in:
- GitHub contributors page
- Project README.md (for significant contributions)
- Release notes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the Non-Linear Video Editor! Your efforts help make this project better for everyone.
