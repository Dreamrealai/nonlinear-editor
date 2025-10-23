#!/bin/bash

# ============================================
# Secret Detection Script
# ============================================
# This script scans for accidentally committed secrets
# Run before committing to ensure no real API keys leak
#
# Usage:
#   ./scripts/check-secrets.sh
#   ./scripts/check-secrets.sh --strict  # Exit with error if secrets found
#
# Can be used as a pre-commit hook:
#   ln -s ../../scripts/check-secrets.sh .git/hooks/pre-commit

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Track if secrets were found
SECRETS_FOUND=0

echo "🔍 Scanning for exposed secrets..."
echo ""

# ============================================
# 1. Check for .env.local in git
# ============================================
if git ls-files --error-unmatch .env.local 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: .env.local is tracked by git!${NC}"
    echo "   This file contains real API keys and should NEVER be committed"
    echo "   Run: git rm --cached .env.local"
    SECRETS_FOUND=1
fi

# ============================================
# 2. Scan for common API key patterns
# ============================================
echo "Checking for API key patterns in staged files..."

# Common secret patterns
declare -A PATTERNS=(
    ["Stripe Secret Keys"]="sk_live_[A-Za-z0-9]{99}|sk_test_[A-Za-z0-9]{99}"
    ["Stripe Publishable Keys"]="pk_live_[A-Za-z0-9]{99}|pk_test_[A-Za-z0-9]{99}"
    ["OpenAI Keys"]="sk-proj-[A-Za-z0-9_-]{140,}"
    ["Google AI Studio Keys"]="AIza[A-Za-z0-9_-]{35}"
    ["Resend API Keys"]="re_[A-Za-z0-9]{24,}"
    ["Supabase JWT Tokens"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"
    ["Generic API Keys"]="(api[_-]?key|apikey|api[_-]?secret)['\"]?\s*[:=]\s*['\"]?[A-Za-z0-9_-]{32,}"
    ["Vercel Tokens"]="(vercel|VERCEL)[_-]?(token|TOKEN)['\"]?\s*[:=]\s*['\"]?[A-Za-z0-9]{24}"
    ["Private Keys"]="-----BEGIN (RSA |EC )?PRIVATE KEY-----"
)

# Get list of staged files (or all tracked files if not in git workflow)
if git rev-parse --git-dir > /dev/null 2>&1; then
    # In a git repo - check staged files
    FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || git ls-files)
else
    # Not in git - check all files
    FILES=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.git/*")
fi

# Exclude safe files
SAFE_FILES=".env.local.example .env.local.template SECURITY.md scripts/check-secrets.sh"

for pattern_name in "${!PATTERNS[@]}"; do
    pattern="${PATTERNS[$pattern_name]}"

    while IFS= read -r file; do
        # Skip if file is in safe list
        skip=0
        for safe_file in $SAFE_FILES; do
            if [[ "$file" == *"$safe_file"* ]]; then
                skip=1
                break
            fi
        done

        if [ $skip -eq 1 ]; then
            continue
        fi

        # Skip binary and excluded files
        if [[ "$file" == *.png ]] || [[ "$file" == *.jpg ]] || [[ "$file" == *.jpeg ]] || \
           [[ "$file" == *.gif ]] || [[ "$file" == *.ico ]] || [[ "$file" == *.pdf ]] || \
           [[ "$file" == *node_modules/* ]] || [[ "$file" == *.next/* ]] || \
           [[ "$file" == *.git/* ]]; then
            continue
        fi

        # Check if file exists and is readable
        if [ -f "$file" ] && [ -r "$file" ]; then
            # Search for pattern
            matches=$(grep -niE "$pattern" "$file" 2>/dev/null || true)

            if [ -n "$matches" ]; then
                echo -e "${RED}❌ Found $pattern_name in: $file${NC}"
                echo "$matches" | head -3
                echo ""
                SECRETS_FOUND=1
            fi
        fi
    done <<< "$FILES"
done

# ============================================
# 3. Check for common credential files
# ============================================
echo "Checking for credential files..."

CREDENTIAL_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    ".env.development"
    "credentials.json"
    "service-account.json"
    "*.pem"
    "*.key"
)

for pattern in "${CREDENTIAL_FILES[@]}"; do
    if git ls-files --error-unmatch "$pattern" 2>/dev/null; then
        echo -e "${RED}❌ Credential file tracked: $pattern${NC}"
        SECRETS_FOUND=1
    fi
done

# ============================================
# 4. Check documentation files for real keys
# ============================================
echo "Checking documentation files..."

DOC_FILES=$(find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -name "check-secrets.sh")

for file in $DOC_FILES; do
    # Check for real email addresses (not example.com)
    real_emails=$(grep -iE '[a-zA-Z0-9._%+-]+@(?!example\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' "$file" 2>/dev/null || true)
    if [ -n "$real_emails" ] && [[ "$file" != *"SECURITY.md"* ]]; then
        # Filter out common safe domains
        filtered=$(echo "$real_emails" | grep -v "@resend.dev\|@supabase.co\|@vercel.app\|@stripe.com\|@google.com" || true)
        if [ -n "$filtered" ]; then
            echo -e "${YELLOW}⚠️  Found real email addresses in: $file${NC}"
            echo "$filtered" | head -3
            echo ""
        fi
    fi

    # Check for real API keys in docs
    real_keys=$(grep -E "re_[A-Za-z0-9]{24,}|sk-proj-[A-Za-z0-9_-]{140,}|AIza[A-Za-z0-9_-]{35}" "$file" 2>/dev/null || true)
    if [ -n "$real_keys" ]; then
        echo -e "${RED}❌ Found API keys in documentation: $file${NC}"
        echo "$real_keys" | head -3
        echo ""
        SECRETS_FOUND=1
    fi
done

# ============================================
# Results
# ============================================
echo ""
echo "========================================"

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No secrets detected!${NC}"
    echo "   Safe to commit"
    exit 0
else
    echo -e "${RED}❌ SECRETS DETECTED!${NC}"
    echo ""
    echo "Action required:"
    echo "1. Remove real secrets from the files listed above"
    echo "2. Replace with placeholders (e.g., 'your-api-key-here')"
    echo "3. Ensure real keys are only in .env.local (which is gitignored)"
    echo "4. If secrets were already committed:"
    echo "   - Revoke and rotate ALL exposed keys immediately"
    echo "   - Clean git history with: git filter-repo or BFG"
    echo ""
    echo "See SECURITY.md for more information"
    echo ""

    # If --strict flag is used, exit with error
    if [[ "$1" == "--strict" ]]; then
        exit 1
    else
        echo -e "${YELLOW}⚠️  Warning mode: Not blocking commit${NC}"
        echo "   Use --strict flag to block commits with secrets"
        exit 0
    fi
fi
