#!/bin/bash

# Script to push environment variables from .env.local to Vercel
# This script will push to production, preview, and development environments

set -e

echo "🚀 Pushing environment variables to Vercel..."
echo ""

# Read .env.local and push each variable
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  if [[ -z "$key" ]] || [[ "$key" =~ ^# ]]; then
    continue
  fi

  # Remove any quotes from the value
  value="${value%\"}"
  value="${value#\"}"

  echo "📤 Pushing $key to production, preview, and development..."

  # Push to all three environments
  for env in production preview development; do
    # Check if variable already exists
    if vercel env ls 2>&1 | grep -q "$key.*$env"; then
      echo "  ⏭️  $key already exists in $env, skipping..."
    else
      echo "$value" | vercel env add "$key" "$env" 2>&1 | tail -1 || true
    fi
  done

  echo "✅ $key pushed successfully"
  echo ""

done < .env.local

echo ""
echo "✅ All environment variables pushed to Vercel!"
echo "🔄 You may need to redeploy your application for changes to take effect."
echo "   Run: vercel --prod"
