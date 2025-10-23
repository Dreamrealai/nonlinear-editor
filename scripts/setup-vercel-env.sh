#!/bin/bash

# Setup Vercel Environment Variables
# This script helps you add environment variables to Vercel production

echo "🚀 Vercel Environment Variable Setup"
echo "===================================="
echo ""
echo "This script will help you add environment variables to Vercel."
echo "You'll need to add them manually via the Vercel dashboard or CLI."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your environment variables first."
    exit 1
fi

echo "✅ Found .env.local file"
echo ""
echo "📋 Required Environment Variables for Production:"
echo "================================================"
echo ""

# Extract non-comment, non-empty lines from .env.local
grep -v '^#' .env.local | grep -v '^$' | while IFS='=' read -r key value; do
    if [ -n "$key" ]; then
        echo "  $key"
    fi
done

echo ""
echo "🔧 How to Add Variables to Vercel:"
echo "=================================="
echo ""
echo "Method 1: Vercel Dashboard (Easiest)"
echo "  1. Go to: https://vercel.com/dream-real/non-linear-editor"
echo "  2. Click: Settings → Environment Variables"
echo "  3. Click: Add New"
echo "  4. Copy each variable name and value from .env.local"
echo "  5. Select: Production, Preview, Development (or as needed)"
echo "  6. Click: Save"
echo ""
echo "Method 2: Vercel CLI (Bulk)"
echo "  Run these commands for each variable:"
echo ""

# Generate vercel env add commands
grep -v '^#' .env.local | grep -v '^$' | while IFS='=' read -r key value; do
    if [ -n "$key" ]; then
        echo "  vercel env add $key production"
    fi
done

echo ""
echo "Method 3: Vercel CLI (From File)"
echo "  You can also use environment variable sync:"
echo "  vercel env pull .env.vercel.local"
echo "  vercel env push .env.local production"
echo ""
echo "⚠️  IMPORTANT: After adding variables, redeploy your app:"
echo "  vercel --prod"
echo ""
echo "📝 Critical Variables to Add First:"
echo "==================================="
echo "  1. NEXT_PUBLIC_SUPABASE_URL"
echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  3. SUPABASE_SERVICE_ROLE_KEY"
echo "  4. STRIPE_SECRET_KEY"
echo "  5. STRIPE_WEBHOOK_SECRET"
echo "  6. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo ""
echo "Run './scripts/add-vercel-env-interactive.sh' for interactive setup"
