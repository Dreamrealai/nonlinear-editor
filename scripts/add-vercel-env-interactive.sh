#!/bin/bash

# Interactive Vercel Environment Variable Setup
# Adds critical environment variables one by one

echo "🚀 Interactive Vercel Environment Variable Setup"
echo "==============================================="
echo ""
echo "This script will help you add critical environment variables to Vercel."
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Error: Vercel CLI not found!"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Critical variables
CRITICAL_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    "GOOGLE_SERVICE_ACCOUNT"
    "AXIOM_TOKEN"
    "AXIOM_DATASET"
)

echo "This script will add ${#CRITICAL_VARS[@]} critical environment variables."
echo ""
echo "For each variable, you'll need to paste the value from your .env.local file."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Function to add environment variable
add_env_var() {
    local var_name=$1

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Adding: $var_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check if variable exists in .env.local
    if [ -f .env.local ]; then
        local value=$(grep "^${var_name}=" .env.local | cut -d'=' -f2-)
        if [ -n "$value" ]; then
            echo "Found value in .env.local"
            echo ""
            echo "Value preview: ${value:0:50}..."
            echo ""
            read -p "Use this value? (y/n): " use_value

            if [ "$use_value" = "y" ] || [ "$use_value" = "Y" ]; then
                echo "$value" | vercel env add "$var_name" production
                echo "✅ Added $var_name to production"

                read -p "Add to Preview environment too? (y/n): " add_preview
                if [ "$add_preview" = "y" ] || [ "$add_preview" = "Y" ]; then
                    echo "$value" | vercel env add "$var_name" preview
                    echo "✅ Added $var_name to preview"
                fi

                read -p "Add to Development environment too? (y/n): " add_dev
                if [ "$add_dev" = "y" ] || [ "$add_dev" = "Y" ]; then
                    echo "$value" | vercel env add "$var_name" development
                    echo "✅ Added $var_name to development"
                fi

                return 0
            fi
        fi
    fi

    # Manual entry if not found or not using .env.local value
    echo "Enter value manually:"
    vercel env add "$var_name" production

    echo ""
}

# Add each critical variable
for var in "${CRITICAL_VARS[@]}"; do
    add_env_var "$var"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Critical Environment Variables Added!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Verify variables: vercel env ls"
echo "  2. Add remaining optional variables via dashboard"
echo "  3. Redeploy: vercel --prod"
echo ""
echo "📝 Optional variables to add via dashboard:"
echo "  - FAL_API_KEY"
echo "  - ELEVENLABS_API_KEY"
echo "  - COMET_API_KEY"
echo "  - OPENAI_API_KEY"
echo "  - AISTUDIO_API_KEY"
echo "  - RESEND_API_KEY"
echo "  And others from .env.local.example"
