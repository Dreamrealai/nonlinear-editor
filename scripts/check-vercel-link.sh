#!/bin/bash

# Vercel Project Link Checker
# Prevents accidental duplicate project creation

set -e

EXPECTED_PROJECT="non-linear-editor-nine"
EXPECTED_TEAM="dream-real-b2bc4dd2"

echo "🔍 Checking Vercel project link..."

# Check if .vercel directory exists
if [ ! -d ".vercel" ]; then
    echo "❌ ERROR: .vercel directory not found!"
    echo "   Run: vercel link --project $EXPECTED_PROJECT --yes"
    exit 1
fi

# Check if project.json exists
if [ ! -f ".vercel/project.json" ]; then
    echo "❌ ERROR: .vercel/project.json not found!"
    echo "   Run: vercel link --project $EXPECTED_PROJECT --yes"
    exit 1
fi

# Read project name from JSON
CURRENT_PROJECT=$(cat .vercel/project.json | grep -o '"projectName":"[^"]*"' | cut -d'"' -f4)
CURRENT_ORG=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)

# Verify project name
if [ "$CURRENT_PROJECT" != "$EXPECTED_PROJECT" ]; then
    echo "❌ ERROR: Linked to wrong project!"
    echo "   Current:  $CURRENT_PROJECT"
    echo "   Expected: $EXPECTED_PROJECT"
    echo ""
    echo "   Fix with: rm -rf .vercel && vercel link --project $EXPECTED_PROJECT --yes"
    exit 1
fi

# Get team ID from orgId (simplified check)
if [[ "$CURRENT_ORG" != *"team"* ]]; then
    echo "⚠️  WARNING: Not linked to a team (using personal account)"
    echo "   Team ID: $CURRENT_ORG"
fi

echo "✅ Correctly linked to: $CURRENT_PROJECT"
echo "   Team/Org: $CURRENT_ORG"
echo ""
echo "👍 Safe to deploy!"
echo ""
echo "Deployment options:"
echo "  1. Auto-deploy:   git push (RECOMMENDED)"
echo "  2. Preview:       vercel --prod=false"
echo "  3. Production:    vercel --prod"

exit 0
