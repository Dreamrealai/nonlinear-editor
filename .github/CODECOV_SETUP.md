# Codecov Setup Guide

## Quick Setup (5 minutes)

Follow these steps to enable Codecov coverage reporting for this repository.

### Step 1: Sign up for Codecov
1. Go to [https://codecov.io](https://codecov.io)
2. Click **"Sign up with GitHub"**
3. Authorize Codecov to access your GitHub account

### Step 2: Add Repository to Codecov
1. Once logged in, click **"Add new repository"**
2. Find `non-linear-editor` in the list
3. Click **"Setup repo"**

### Step 3: Copy the Codecov Token
1. After adding the repo, Codecov will display your `CODECOV_TOKEN`
2. Copy the token (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Step 4: Add Token to GitHub Secrets
1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `CODECOV_TOKEN`
5. Value: Paste the token from Step 3
6. Click **"Add secret"**

### Step 5: Verify Setup
1. Make a small change to any file
2. Commit and push to a new branch
3. Open a Pull Request
4. Wait for CI to complete
5. Check the PR for Codecov comment with coverage report

## Configuration

The repository already has a `codecov.yml` configuration file with optimal settings:

```yaml
coverage:
  status:
    project:
      default:
        target: 70%  # Overall project coverage target
    patch:
      default:
        target: 70%  # New code coverage target
```

## Features Enabled

✅ **Automatic coverage reports** on every PR
✅ **Coverage diff** showing changes from base branch
✅ **File-level coverage** breakdown
✅ **Coverage thresholds** enforcement (70%)
✅ **Flags** for different test types (unit, integration, security)
✅ **PR comments** with coverage summary
✅ **GitHub status checks** integration

## Codecov Badge

After setup, add the Codecov badge to your README.md:

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/non-linear-editor/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/YOUR_USERNAME/non-linear-editor)
```

Replace `YOUR_USERNAME` and `YOUR_TOKEN` with your actual values from Codecov.

## Troubleshooting

### Coverage not uploading
- Verify `CODECOV_TOKEN` secret is set correctly
- Check that `coverage/lcov.info` file is generated
- Review CI logs for Codecov upload step

### Coverage percentage incorrect
- Ensure `codecov.yml` ignore patterns match your project structure
- Check that test files are properly excluded
- Verify Jest coverage configuration in `jest.config.js`

### Codecov check failing
- Review threshold settings in `codecov.yml`
- Check if patch coverage meets 70% target
- Verify project coverage meets 70% target

## Cost

**Codecov is FREE for:**
- ✅ Public repositories (unlimited)
- ✅ Private repositories (up to 5 users)

**Paid plans start at $10/month** for private repos with more users.

## Additional Resources

- [Codecov Documentation](https://docs.codecov.com/)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
- [Coverage Flags](https://docs.codecov.com/docs/flags)
- [Status Checks](https://docs.codecov.com/docs/commit-status)

## Support

If you encounter issues:
1. Check [Codecov Status](https://status.codecov.io/)
2. Review [Codecov Support Docs](https://docs.codecov.com/)
3. Contact [Codecov Support](https://codecov.io/support)
